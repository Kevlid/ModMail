import { HydratedDocument, InferSchemaType, Model, Schema, model } from "mongoose";
import { client } from "../client";

export enum TicketStatus {
    OPEN = "open",
    CLOSED = "closed"
}

export enum TicketMessageRole {
    USER = "user",
    STAFF = "staff",
    SYSTEM = "system"
}

export enum TicketMessageInternal {
    TRUE = "true",
    FALSE = "false"
}

const ticketMessageSchema = new Schema(
    {
        role: {
            type: String,
            enum: Object.values(TicketMessageRole),
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        internal: {
            type: String,
            enum: Object.values(TicketMessageInternal),
            required: true,
            default: TicketMessageInternal.FALSE
        },
        attachments: {
            type: [String],
            default: []
        },
        timestamp: {
            type: Date,
            required: true,
            default: () => new Date()
        }
    },
    {
        _id: false
    }
);

const ticketSchema = new Schema(
    {
        _id: {
            type: String,
            default: () => client.randomId(Date.now())
        },
        userId: {
            type: String,
            required: true,
            index: true
        },
        channelId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        categoryId: {
            type: String,
            required: true
        },
        urgent: {
            type: Boolean,
            required: true,
            default: false
        },
        status: {
            type: String,
            enum: Object.values(TicketStatus),
            required: true,
            default: TicketStatus.OPEN,
            index: true
        },
        messages: {
            type: [ticketMessageSchema],
            default: []
        },
        createdAt: {
            type: Date,
            required: true,
            default: () => new Date()
        }
    },
    {
        versionKey: false
    }
);

ticketSchema.index({ userId: 1, status: 1 });

export type TicketDocument = HydratedDocument<InferSchemaType<typeof ticketSchema>>;
export const TicketModel = model<TicketDocument>("Ticket", ticketSchema);