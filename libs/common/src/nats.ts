import { connect, JSONCodec, NatsConnection, StringCodec, Subscription } from 'nats';

export type Handler = (data: any) => Promise<any> | any;

export async function connectNats(url: string) : Promise<NatsConnection> {
  return await connect({ servers: url });
}

const jc = JSONCodec();
const sc = StringCodec();

export async function request<T=any>(nc: NatsConnection, subject: string, data: any, timeoutMs=2000): Promise<T> {
  const msg = await nc.request(subject, jc.encode(data), { timeout: timeoutMs });
  try {
    return jc.decode(msg.data) as T;
  } catch {
    // allow string payloads too
    return JSON.parse(sc.decode(msg.data)) as T;
  }
}

export function serve(nc: NatsConnection, subject: string, handler: Handler): Subscription {
  return nc.subscribe(subject, {
    callback: async (err, msg) => {
      if (err) {
        msg.respond(sc.encode(JSON.stringify({ ok:false, error: err.message })));
        return;
      }
      try {
        const payload = jc.decode(msg.data);
        const result = await handler(payload);
        msg.respond(jc.encode(result));
      } catch (e: any) {
        msg.respond(jc.encode({ ok:false, error: e?.message || 'Internal error' }));
      }
    }
  });
}
