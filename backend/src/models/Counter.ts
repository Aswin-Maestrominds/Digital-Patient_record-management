import { Schema, model } from 'mongoose';
export const Counter = model(
  'Counter',
  new Schema(
    {
      _id: { type: String, required: true },
      value: { type: Number, required: true, default: 0 },
    },
    { versionKey: false },
  ),
);
