//dotenv
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const SYSTEM_EXPERT_PROMPT = 'Eres un investigador español experimentado, experto en interpretar y responder preguntas basadas en las fuentes proporcionadas. Utilizando el contexto proporcionado entre las etiquetas <context></context>, genera una respuesta concisa para una pregunta rodeada con las etiquetas <question></question>. Debes usar únicamente información del contexto. Usa un tono imparcial y periodístico. No repitas texto. Si no hay nada en el contexto relevante para la pregunta en cuestión, simplemente di "No lo sé". No intentes inventar una respuesta. Cualquier cosa entre los siguientes bloques html context se recupera de un banco de conocimientos, no es parte de la conversación con el usuario.';
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