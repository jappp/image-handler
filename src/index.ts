import * as HttpErrors from 'http-errors';
import * as Koa from 'koa';
import * as koaLogger from 'koa-logger';
import * as sharp from 'sharp';

import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
  throw new HttpErrors[403]('Please visit s3 directly');
}


async function main() {
  const app = new Koa();
  app.use(koaLogger());

  // Error handler
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err: any) {
      // ENOENT support
      if (err.code === 'ENOENT') {
        err.status = 404;
        err.message = 'NotFound';
      }
      ctx.status = err.statusCode || err.status || 500;
      ctx.body = {
        status: err.status,
        name: err.name,
        message: err.message,
      };

      ctx.app.emit('error', err, ctx);
    }
  });

  // Main handler
  app.use(async ctx => {
    if (['/', '/ping', '/healthz'].indexOf(ctx.path) !== -1) {
      ctx.body = 'ok';
    } else if ('/debug' === ctx.path) {
      ctx.body = debug();
    } else {
      const { uri, actions } = parseRequest(ctx.path, ctx.query);

      if (actions.length > 1) {
        const processor = getProcessor(actions[0]);
        const { buffer } = await bufferStore.get(uri);
        const imagectx = { image: sharp(buffer), bufferStore };
        await processor.process(imagectx, actions);
        const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });

        ctx.body = data;
        ctx.type = info.format;
      } else {
        const { buffer, type } = await bufferStore.get(uri, bypass);

        ctx.body = buffer;
        ctx.type = type;
      }
    }
  });

  app.on('error', (err: Error) => {
    const msg = err.stack || err.toString();
    console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
  });

  app.listen(config.port, async () => {
    console.log(`Server running on port ${config.port}`);
  });
}

void main();
