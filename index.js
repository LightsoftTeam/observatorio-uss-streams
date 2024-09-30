import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { ObservatoryService } from './services/observatory.service.js';
import { getTextFromHtml } from './helpers/get-text-from-html.helper.js';
import { OpenaiService } from './services/openai.service.js';

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5555;

const sendEvent = (data, res) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
    if(data.type === 'end') {
        res.end();
    }
};

app.get('/posts/:id/ask', async (req, res) => {
    console.log({ params: req.params });
    const { id: postId } = req.params;
    if(!postId) {
        res.status(400).send('Post id is required');
        return res.end();
    }
    const { question } = req.query;
    if (!question) {
        res.status(400).send('Question is required');
        return res.end();
    }
    const post = await ObservatoryService.getPost(postId);

    if (!post) {
        console.log('Post not found');
        res.status(404).send('Post not found');
        return res.end();
    }

    console.log('Post found', post.id);
    const context = getTextFromHtml(post.content);

    const aiResponse = await OpenaiService.askAbout({ context, question });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const part of aiResponse) {
        if (!part.choices[0].delta.content) {
            continue;
        }
        console.log(part.choices[0].delta.content);
        sendEvent({
            type: 'partial-content',
            payload: part.choices[0].delta.content
        }, res);
    }

    sendEvent({
        type: 'end',
    }, res);

    req.on('close', () => {
        console.log('Connection closed');
        res.end();
    });
});

app.post('/conversations', async (req, res) => {
    const { body, userId } = req.body;
    const now = new Date();
    const conversation = {
        id: uuid(),
        title: body.slice(0, 20),
        userId,
        lastMessageAt: now.toISOString(),
        createdAt: now.toISOString(),
    }
    const conversationId = conversation.id;
    const message = {
        id: uuid(),
        role: 'user',
        body,
        createdAt: now.toISOString(),
    }
    const aiMessages = [{ role: "user", content: body }];
    const aiResponse = await OpenaiService.getCompletion(aiMessages);

    console.log('open ai has responded');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let aiMessageBody = '';

    for await (const part of aiResponse) {
        if (!part.choices[0].delta.content) {
            continue;
        }
        console.log(part.choices[0].delta.content);
        sendEvent({
            type: 'partial-content',
            payload: part.choices[0].delta.content
        }, res);
        aiMessageBody += part.choices[0].delta.content;
    }

    const aiMessage = {
        id: uuid(),
        role: 'assistant',
        body: aiMessageBody,
        createdAt: now.toISOString(),
    }

    sendEvent({
        type: 'end', payload: {
            conversation,
            inputMessage: {
                ...message,
                conversationId,
            },
            responseMessage: {
                ...aiMessage,
                conversationId,
            }
        }
    }, res);

    const saveInBd = async () => {
        await ObservatoryService.createConversation(conversation);
        await ObservatoryService.createMessage(conversationId, message);
        ObservatoryService.createMessage(conversationId, aiMessage);
    }

    console.log('saving in bd');
    saveInBd();

    req.on('close', () => {
        console.log('Closing connection in create conversation');
        res.end(); 
    });
});

app.post('/conversations/:id/messages', async (req, res) => {
    const { body } = req.body;
    const { id: conversationId } = req.params;
    if (!conversationId) {
        res.status(400).send('Conversation id is required');
        return res.end();
    }
    const now = new Date();
    const message = {
        id: uuid(),
        role: 'user',
        body,
        createdAt: now.toISOString(),
    }
    const conversationMessages = await ObservatoryService.getMessages(conversationId);
    const aiMessages = [
        ...conversationMessages.map(({ role, body }) => ({ role, content: body })),
        { role: "user", content: body }
    ];
    const aiResponse = await OpenaiService.getCompletion(aiMessages);

    console.log('open ai has responded');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let aiMessageBody = '';

    for await (const part of aiResponse) {
        if (!part.choices[0].delta.content) {
            continue;
        }
        console.log(part.choices[0].delta.content);
        sendEvent({
            type: 'partial-content',
            payload: part.choices[0].delta.content
        }, res);
        aiMessageBody += part.choices[0].delta.content;
    }

    const aiMessage = {
        id: uuid(),
        role: 'assistant',
        body: aiMessageBody,
        createdAt: now.toISOString(),
    }

    sendEvent({
        type: 'end',
        payload: {
            inputMessage: {
                ...message,
                conversationId,
            },
            responseMessage: {
                ...aiMessage,
                conversationId,
            }
        }
    }, res);

    const saveInBd = () => {
        ObservatoryService.createMessage(conversationId, message);
        ObservatoryService.createMessage(conversationId, aiMessage);
    }

    console.log('saving in bd');
    saveInBd();

    req.on('close', () => {
        res.end(); // Asegúrate de cerrar la respuesta
    });
});

app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

app.listen(PORT, () => {
    console.log(`Servidor SSE escuchando en http://localhost:${PORT}`);
});