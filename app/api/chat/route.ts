import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { currentMessage, image } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini model from environment or fallback to 1.5 Flash
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
    
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
    console.log('Model name:', modelName);
    console.log('Temperature:', temperature);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature,
      },
    });

    let result;
    
    const systemPrompt = `You are a helpful AI assistant for a piano learning application. 
You help users understand music notation, identify notes, chords, and musical elements. 
When analyzing images of sheet music, be specific about note names, positions, and musical context.
Keep responses concise and educational.`;

    if (image) {
      // Handle image + text
      const imagePart = {
        inlineData: {
          data: image.split(',')[1], // Remove data:image/png;base64, prefix
          mimeType: 'image/png',
        },
      };

      result = await model.generateContent([systemPrompt, currentMessage, imagePart]);
    } else {
      // Handle text only
      result = await model.generateContent([systemPrompt, currentMessage]);
    }

    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
