import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const database = client.db('clicks_and_go_db');
    const collection = database.collection('decisiones_agentes');
    
    // Obtenemos las últimas decisiones para mostrar en el dashboard
    const stats = await collection.find({}).sort({ _id: -1 }).limit(10).toArray();
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: "Error en el puente de MongoDB" }, { status: 500 });
  } finally {
    await client.close();
  }
}
