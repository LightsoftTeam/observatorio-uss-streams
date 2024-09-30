//axios
import axios from 'axios';

//dotenv
import dotenv from 'dotenv';
dotenv.config();

export class ObservatoryService {
    static client = axios.create({
        baseURL: process.env.OBSERVATORY_API_URL || ''
    });

    constructor() { }

    static async getPost(id) {
        try {
            const { data } = await ObservatoryService.client.get(`/posts/${id}`);
            return data;
        } catch (error) {
            //404 => null
            if (error.response.status === 404) {
                return null;
            }
            throw error;
        }
    }

    static async createConversation(conversation) {
        const { data } = await ObservatoryService.client.post('/conversations', conversation);
        return data;
    }

    static async createMessage(conversationId, message) {
        const { data } = await ObservatoryService.client.post(`/conversations/${conversationId}/messages`, message);
        return data;
    }

    static async getMessages(conversationId) {
        const { data } = await ObservatoryService.client.get(`/conversations/${conversationId}/messages`);
        return data;
    }
}