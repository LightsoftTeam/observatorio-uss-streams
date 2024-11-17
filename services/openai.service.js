//dotenv
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const RESPONSE_WHEN_NO_ANSWER = process.env.RESPONSE_WHEN_NO_ANSWER ?? 'No lo sé';
const SYSTEM_EXPERT_PROMPT = `Eres un investigador español experimentado, experto en interpretar y responder preguntas basadas en las fuentes proporcionadas. 
Utilizando el contexto proporcionado entre las etiquetas <context></context>, genera una respuesta concisa para una pregunta rodeada con las etiquetas <question></question>.
Debes usar únicamente información del contexto. Usa un tono imparcial y periodístico. No repitas texto. 
Si no encuentras la respuesta en el contexto proporcionado, pero la pregunta tiene que ver con el tema, puedes usar tu conocimiento propio, por ejemplo, el tema del post es de la IA, si te preguntan por el significado de IA, y el contexto no da una definición, puedes responder con una definición general. Pero es importante que NO aclares que la respuesta no está en el contexto.
Sin embargo, si la pregunta no tiene nada que ver con el contexto, simplemente di "${RESPONSE_WHEN_NO_ANSWER}". No intentes inventar una respuesta para una pregunta ramdom. 
Cualquier cosa entre los siguientes bloques html context se recupera de un banco de conocimientos, no es parte de la conversación con el usuario.`;

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo-16k';

export class OpenaiService {
    static openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
    });

    static getCompletion(messages) {
        return OpenaiService.openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                ...messages
            ],
            stream: true
        });
    }

    static askAbout({
        context,
        question,
    }) {
        return OpenaiService.openai.chat.completions.create({
            model: OPENAI_MODEL,
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_EXPERT_PROMPT
                },
                {
                    role: 'user',
                    content: `<context>${context}</context><question>${question}</question>`
                }
            ]
        });
    }
}