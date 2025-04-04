import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Message } from 'ai';

// This API handles chat requests and returns text streams
// All AI responses support markdown formatting including:
// - Bold text with ** or __
// - Italic text with * or _
// - Code blocks with ```language (with syntax highlighting and copy button)
// - Inline code with `code`
// - Links with [text](url)
// - Unordered lists with - or * 
// - Ordered lists with 1., 2., etc.

export const runtime = 'edge';

// Helper function to create a promise that rejects after a timeout
const createTimeoutPromise = (timeoutMs: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
};

// Apply timeout to a promise
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs)
  ]) as Promise<T>;
};

export async function POST(req: Request) {
  console.log('[API] Chat request started');
  try {
    const { messages, model, apiKey } = await req.json();
    console.log('[API] Request details:', { 
      provider: model?.provider, 
      model: model?.id, 
      messageCount: messages?.length
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Please enter a message to chat with the AI' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key is missing. Please add an API key in settings' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (!model?.id || !model?.provider) {
      return new Response(JSON.stringify({ error: 'Model information is missing. Please select a model' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    switch (model.provider) {
      case 'google': {
        try {
          console.log('[API] Using Google AI with model:', model.id);
          const genAI = new GoogleGenerativeAI(apiKey);
          const googleModel = genAI.getGenerativeModel({ 
            model: model.id,
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          });
          
          // Prepare messages for Google's format
          const googleMessages = messages.map((message: Message) => ({
            role: message.role === 'user' ? 'user' : 'model',
            parts: [{ text: message.content }]
          }));
          
          console.log('[API] Google AI formatted messages:', JSON.stringify(googleMessages));
          console.log('[API] Google AI request configuration:', {
            model: model.id,
            temperature: 0.7,
            maxOutputTokens: 2048,
            safetySettingsCount: 4,
            messageCount: googleMessages.length
          });
          
          // First get a regular non-streaming response to use as fallback if streaming fails
          try {
            // Non-streaming call as a fallback
            const result = await withTimeout(
              googleModel.generateContentStream({
                contents: googleMessages
              }),
              60000 // 1 minute timeout for Google AI
            );
            
            console.log('[API] Google AI stream started');
            
            // Create a simple text encoder
            const encoder = new TextEncoder();
            
            // Create a simple ReadableStream that outputs text directly
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  let chunkCount = 0;
                  
                  for await (const chunk of result.stream) {
                    chunkCount++;
                    const text = chunk.text();
                    if (text) {
                      console.log(`[API] Processing chunk: ${text.substring(0, 20)}...`);
                      controller.enqueue(encoder.encode(text));
                    }
                  }
                  
                  console.log(`[API] Google AI stream finished with ${chunkCount} chunks`);
                  controller.close();
                } catch (error) {
                  console.error('[API] Error in Google AI stream:', error);
                  controller.error(error);
                }
              }
            });
            
            // Return a simple text stream
            return new Response(stream, { 
              headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
            });
          } catch (streamingError) {
            // If streaming fails, try non-streaming as fallback
            console.error('[API] Streaming error, falling back to non-streaming mode:', streamingError);
            
            const nonStreamingResponse = await withTimeout(
              googleModel.generateContent({
                contents: googleMessages
              }),
              30000 // 30 second timeout for fallback
            );
            
            const responseText = nonStreamingResponse.response.text();
            console.log('[API] Got non-streaming response:', responseText.substring(0, 100) + '...');
            
            return new Response(responseText);
          }
        } catch (error: unknown) {
          console.error('[API] Google AI error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const userMessage = error instanceof Error && error.message.includes('API key not valid') 
            ? 'Invalid Google API key. Please check your API key in settings.'
            : `Google AI error: ${errorMessage}`;
          
          console.error('[API] Returning error response:', userMessage);
          
          // Return a text response with the error message
          return new Response(userMessage, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          });
        }
      }
      
      case 'anthropic': {
        try {
          console.log('[API] Using Anthropic with model:', model.id);
          const anthropic = new Anthropic({ apiKey });
          
          const response = await withTimeout(
            anthropic.messages.create({
              model: model.id,
              max_tokens: 4096,
              messages: messages,
              stream: true
            }),
            60000 // 1 minute timeout for Anthropic
          );
          
          // Use the SDK's toReadableStream method
          const stream = response.toReadableStream();
          
          // Return a simple text response
          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] Anthropic error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const userMessage = error instanceof Error && (error.message.includes('401') || error.message.includes('auth'))
            ? 'Invalid Anthropic API key. Please check your API key in settings.'
            : `Anthropic error: ${errorMessage}`;
          
          return new Response(JSON.stringify({ error: userMessage }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      case 'openai': {
        try {
          console.log('[API] Using OpenAI with model:', model.id);
          const openai = new OpenAI({ apiKey });
          
          const response = await withTimeout(
            openai.chat.completions.create({
              model: model.id,
              messages,
              stream: true
            }),
            60000 // 1 minute timeout for OpenAI
          );
          
          // Use the SDK's toReadableStream method
          const stream = response.toReadableStream();
          
          // Return a simple text response
          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] OpenAI error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const userMessage = error instanceof Error && (error.message.includes('401') || error.message.includes('auth'))
            ? 'Invalid OpenAI API key. Please check your API key in settings.'
            : `OpenAI error: ${errorMessage}`;
          
          return new Response(JSON.stringify({ error: userMessage }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      case 'mistral': {
        try {
          console.log('[API] Using Mistral with model:', model.id);
          
          // Validate and format the messages for Mistral
          // Mistral requires 'user' or 'assistant' roles, and each message must have content
          const validMessages = messages.filter((message: Message) => {
            // Check if message has required properties
            const hasValidRole = message.role === 'user' || message.role === 'assistant' || message.role === 'system';
            const hasContent = typeof message.content === 'string' && message.content.trim() !== '';
            return hasValidRole && hasContent;
          });
          
          // Convert any roles that don't match Mistral's expected format
          const mistralMessages = validMessages.map((message: Message) => ({
            role: message.role === 'system' ? 'user' : message.role, // Mistral doesn't support system role
            content: message.content
          }));
          
          // Log for debugging
          console.log('[API] Formatted Mistral messages:', 
            JSON.stringify(mistralMessages.map((m: { role: string; content: string }) => ({ role: m.role, contentLength: m.content.length }))));
          
          if (mistralMessages.length === 0) {
            throw new Error('No valid messages to send to Mistral');
          }
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
          
          // Send the request with properly formatted messages
          const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model.id,
              messages: mistralMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const status = response.status;
            const statusText = response.statusText;
            
            // For detailed error message, try to get response text
            let errorDetails = '';
            try {
              const errorText = await response.text();
              errorDetails = errorText ? `: ${errorText}` : '';
            } catch {}
            
            let errorMessage = `Mistral API error (${status})${errorDetails}`;
            if (status === 401) {
              errorMessage = 'Invalid Mistral API key. Please check your API key in settings.';
            } else if (status === 429) {
              errorMessage = 'Rate limit exceeded for Mistral API. Please try again later.';
            } else if (status === 422) {
              errorMessage = `Mistral API validation error (422): Check model name and message format.${errorDetails}`;
            } else if (statusText) {
              errorMessage += `: ${statusText}`;
            }
            
            console.error('[API] Mistral error details:', { status, statusText, errorDetails });
            throw new Error(errorMessage);
          }
          
          // Ensure response.body is not null before proceeding
          if (!response.body) {
            throw new Error('Mistral response body is null');
          }
          
          // Create a transformer to process the SSE stream
          const encoder = new TextEncoder();
          const reader = response.body.getReader();
          
          // Create a ReadableStream that extracts and outputs only the content from each chunk
          const stream = new ReadableStream({
            async start(controller) {
              try {
                let buffer = '';
                let done = false;

                while (!done) {
                  const { value, done: doneReading } = await reader.read();
                  done = doneReading;
                  
                  if (value) {
                    // Convert the chunk to text and add to buffer
                    buffer += new TextDecoder().decode(value, { stream: true });
                    
                    // Process any complete SSE messages in the buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                      // SSE messages start with "data: "
                      if (line.startsWith('data: ')) {
                        const data = line.substring(6); // Remove "data: " prefix
                        
                        // Skip [DONE] message
                        if (data === '[DONE]') continue;
                        
                        try {
                          // Parse the JSON payload
                          const parsed = JSON.parse(data);
                          
                          // Extract the actual content delta
                          if (parsed.choices && 
                              parsed.choices[0] && 
                              parsed.choices[0].delta && 
                              parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;
                            controller.enqueue(encoder.encode(content));
                          }
                        } catch (e) {
                          console.error('[API] Error parsing SSE JSON:', e);
                        }
                      }
                    }
                  }
                }
                
                controller.close();
              } catch (error) {
                console.error('[API] Error in Mistral stream:', error);
                controller.error(error);
              }
            }
          });

          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] Mistral error:', error);
          return new Response(JSON.stringify({ error: `Mistral error: ${error instanceof Error ? error.message : 'Unknown error'}` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      case 'xai': {
        try {
          console.log('[API] Using xAI (via Groq) with model:', model.id);
          
          // Validate and format the messages for xAI/Groq
          // Only allow user, assistant, and system roles
          const validMessages = messages.filter((message: Message) => {
            const hasValidRole = message.role === 'user' || message.role === 'assistant' || message.role === 'system';
            const hasContent = typeof message.content === 'string' && message.content.trim() !== '';
            return hasValidRole && hasContent;
          });
          
          console.log('[API] Formatted xAI messages:', 
            JSON.stringify(validMessages.map((m: { role: string; content: string }) => ({ role: m.role, contentLength: m.content.length }))));
          
          if (validMessages.length === 0) {
            throw new Error('No valid messages to send to xAI');
          }
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
          
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model.id,
              messages: validMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const status = response.status;
            const statusText = response.statusText;
            
            // For detailed error message, try to get response text
            let errorDetails = '';
            try {
              const errorText = await response.text();
              errorDetails = errorText ? `: ${errorText}` : '';
            } catch {}
            
            let errorMessage = `xAI/Groq API error (${status})${errorDetails}`;
            if (status === 401) {
              errorMessage = 'Invalid xAI/Groq API key. Please check your API key in settings.';
            } else if (status === 429) {
              errorMessage = 'Rate limit exceeded for xAI/Groq API. Please try again later.';
            } else if (status === 422 || status === 400) {
              errorMessage = `xAI/Groq API validation error (${status}): Check model name and message format.${errorDetails}`;
            } else if (statusText) {
              errorMessage += `: ${statusText}`;
            }
            
            console.error('[API] xAI error details:', { status, statusText, errorDetails });
            throw new Error(errorMessage);
          }
          
          // Ensure response.body is not null before proceeding
          if (!response.body) {
            throw new Error('xAI response body is null');
          }
          
          // Create a transformer to process the SSE stream
          const encoder = new TextEncoder();
          const reader = response.body.getReader();
          
          // Create a ReadableStream that extracts and outputs only the content from each chunk
          const stream = new ReadableStream({
            async start(controller) {
              try {
                let buffer = '';
                let done = false;

                while (!done) {
                  const { value, done: doneReading } = await reader.read();
                  done = doneReading;
                  
                  if (value) {
                    // Convert the chunk to text and add to buffer
                    buffer += new TextDecoder().decode(value, { stream: true });
                    
                    // Process any complete SSE messages in the buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                      // SSE messages start with "data: "
                      if (line.startsWith('data: ')) {
                        const data = line.substring(6); // Remove "data: " prefix
                        
                        // Skip [DONE] message
                        if (data === '[DONE]') continue;
                        
                        try {
                          // Parse the JSON payload
                          const parsed = JSON.parse(data);
                          
                          // Extract the actual content delta
                          if (parsed.choices && 
                              parsed.choices[0] && 
                              parsed.choices[0].delta && 
                              parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;
                            controller.enqueue(encoder.encode(content));
                          }
                        } catch (e) {
                          console.error('[API] Error parsing SSE JSON:', e);
                        }
                      }
                    }
                  }
                }
                
                controller.close();
              } catch (error) {
                console.error('[API] Error in xAI stream:', error);
                controller.error(error);
              }
            }
          });

          // Return a simple text stream
          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] xAI error:', error);
          return new Response(JSON.stringify({ error: `xAI error: ${error instanceof Error ? error.message : 'Unknown error'}` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      case 'perplexity': {
        try {
          console.log('[API] Using Perplexity with model:', model.id);
          
          // Validate and format the messages for Perplexity
          const validMessages = messages.filter((message: Message) => {
            const hasValidRole = message.role === 'user' || message.role === 'assistant' || message.role === 'system';
            const hasContent = typeof message.content === 'string' && message.content.trim() !== '';
            return hasValidRole && hasContent;
          });
          
          console.log('[API] Formatted Perplexity messages:', 
            JSON.stringify(validMessages.map((m: { role: string; content: string }) => ({ role: m.role, contentLength: m.content.length }))));
          
          if (validMessages.length === 0) {
            throw new Error('No valid messages to send to Perplexity');
          }
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
          
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model.id,
              messages: validMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const status = response.status;
            const statusText = response.statusText;
            
            // For detailed error message, try to get response text
            let errorDetails = '';
            try {
              const errorText = await response.text();
              errorDetails = errorText ? `: ${errorText}` : '';
            } catch {}
            
            let errorMessage = `Perplexity API error (${status})${errorDetails}`;
            if (status === 401) {
              errorMessage = 'Invalid Perplexity API key. Please check your API key in settings.';
            } else if (status === 429) {
              errorMessage = 'Rate limit exceeded for Perplexity API. Please try again later.';
            } else if (status === 422 || status === 400) {
              errorMessage = `Perplexity API validation error (${status}): Check model name and message format.${errorDetails}`;
            } else if (statusText) {
              errorMessage += `: ${statusText}`;
            }
            
            console.error('[API] Perplexity error details:', { status, statusText, errorDetails });
            throw new Error(errorMessage);
          }
          
          // Ensure response.body is not null before proceeding
          if (!response.body) {
            throw new Error('Perplexity response body is null');
          }
          
          // Create a transformer to process the SSE stream
          const encoder = new TextEncoder();
          const reader = response.body.getReader();
          
          // Create a ReadableStream that extracts and outputs only the content from each chunk
          const stream = new ReadableStream({
            async start(controller) {
              try {
                let buffer = '';
                let done = false;

                while (!done) {
                  const { value, done: doneReading } = await reader.read();
                  done = doneReading;
                  
                  if (value) {
                    // Convert the chunk to text and add to buffer
                    buffer += new TextDecoder().decode(value, { stream: true });
                    
                    // Process any complete SSE messages in the buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                      // SSE messages start with "data: "
                      if (line.startsWith('data: ')) {
                        const data = line.substring(6); // Remove "data: " prefix
                        
                        // Skip [DONE] message
                        if (data === '[DONE]') continue;
                        
                        try {
                          // Parse the JSON payload
                          const parsed = JSON.parse(data);
                          
                          // Extract the actual content delta
                          if (parsed.choices && 
                              parsed.choices[0] && 
                              parsed.choices[0].delta && 
                              parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;
                            controller.enqueue(encoder.encode(content));
                          }
                        } catch (e) {
                          console.error('[API] Error parsing SSE JSON:', e);
                        }
                      }
                    }
                  }
                }
                
                controller.close();
              } catch (error) {
                console.error('[API] Error in Perplexity stream:', error);
                controller.error(error);
              }
            }
          });

          // Return a simple text stream
          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] Perplexity error:', error);
          return new Response(JSON.stringify({ error: `Perplexity error: ${error instanceof Error ? error.message : 'Unknown error'}` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      case 'lmstudio': {
        try {
          console.log('[API] Using LMStudio with model:', model.id);
          
          // Validate and format the messages for LMStudio
          const validMessages = messages.filter((message: Message) => {
            const hasValidRole = message.role === 'user' || message.role === 'assistant' || message.role === 'system';
            const hasContent = typeof message.content === 'string' && message.content.trim() !== '';
            return hasValidRole && hasContent;
          });
          
          console.log('[API] Formatted LMStudio messages:', 
            JSON.stringify(validMessages.map((m: { role: string; content: string }) => ({ role: m.role, contentLength: m.content.length }))));
          
          if (validMessages.length === 0) {
            throw new Error('No valid messages to send to LMStudio');
          }
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout
          
          const response = await fetch('https://api.lmstudio.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model.id,
              messages: validMessages,
              temperature: 0.7,
              max_tokens: 4096,
              stream: true
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const status = response.status;
            const statusText = response.statusText;
            
            // For detailed error message, try to get response text
            let errorDetails = '';
            try {
              const errorText = await response.text();
              errorDetails = errorText ? `: ${errorText}` : '';
            } catch {}
            
            let errorMessage = `LMStudio API error (${status})${errorDetails}`;
            if (status === 401) {
              errorMessage = 'Invalid LMStudio API key. Please check your API key in settings.';
            } else if (status === 429) {
              errorMessage = 'Rate limit exceeded for LMStudio API. Please try again later.';
            } else if (status === 422 || status === 400) {
              errorMessage = `LMStudio API validation error (${status}): Check model name and message format.${errorDetails}`;
            } else if (statusText) {
              errorMessage += `: ${statusText}`;
            }
            
            console.error('[API] LMStudio error details:', { status, statusText, errorDetails });
            throw new Error(errorMessage);
          }
          
          // Ensure response.body is not null before proceeding
          if (!response.body) {
            throw new Error('LMStudio response body is null');
          }
          
          // Create a transformer to process the SSE stream
          const encoder = new TextEncoder();
          const reader = response.body.getReader();
          
          // Create a ReadableStream that extracts and outputs only the content from each chunk
          const stream = new ReadableStream({
            async start(controller) {
              try {
                let buffer = '';
                let done = false;

                while (!done) {
                  const { value, done: doneReading } = await reader.read();
                  done = doneReading;
                  
                  if (value) {
                    // Convert the chunk to text and add to buffer
                    buffer += new TextDecoder().decode(value, { stream: true });
                    
                    // Process any complete SSE messages in the buffer
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                      // SSE messages start with "data: "
                      if (line.startsWith('data: ')) {
                        const data = line.substring(6); // Remove "data: " prefix
                        
                        // Skip [DONE] message
                        if (data === '[DONE]') continue;
                        
                        try {
                          // Parse the JSON payload
                          const parsed = JSON.parse(data);
                          
                          // Extract the actual content delta
                          if (parsed.choices && 
                              parsed.choices[0] && 
                              parsed.choices[0].delta && 
                              parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;
                            controller.enqueue(encoder.encode(content));
                          }
                        } catch (e) {
                          console.error('[API] Error parsing SSE JSON:', e);
                        }
                      }
                    }
                  }
                }
                
                controller.close();
              } catch (error) {
                console.error('[API] Error in LMStudio stream:', error);
                controller.error(error);
              }
            }
          });

          // Return a simple text stream
          return new Response(stream, { 
            headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
          });
        } catch (error: unknown) {
          console.error('[API] LMStudio error:', error);
          return new Response(JSON.stringify({ error: `LMStudio error: ${error instanceof Error ? error.message : 'Unknown error'}` }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }

      default:
        return new Response(JSON.stringify({ error: `Unsupported provider: ${model.provider}. Please select a supported model.` }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
    }
  } catch (error: unknown) {
    console.error('[API] Unexpected error:', error);
    return new Response(JSON.stringify({ error: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.` }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 