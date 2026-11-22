import {handle} from './rooms.js';
import assets from './assets.js';
export default {async fetch(req,env){const url=new URL(req.url);if(url.pathname.startsWith('/api/rooms'))return handle(req,env);const text=assets[url.pathname];if(text===undefined)return new Response('Not found',{status:404});return new Response(text,{headers:{'content-type':url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','cache-control':'no-cache'}});}};
