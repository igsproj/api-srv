const apiServer = require("./api-srv");

class api extends apiServer {

  setRoutesConfig() {
    this.routesConfig = {
      "GET": {
        routes :
        {
          "/api/customers": this.onGet.bind(this),
        }
      },

      "POST": {
        routes :
        {
          "/api/customers": this.onPost.bind(this),
        }
      },

      "DELETE": {
        routes :
        {
          "/api/customers": this.onDelete.bind(this),
        }
      },

      "PUT": {
        routes :
        {
          "/api/customers": this.onPut.bind(this),
        }
      }
    };
  }

  findBy(field, val) {
    return this.data.find(elem => String(elem[field]) === String(val));
  }

  findByIndex(field, val) {
    return this.data.findIndex(elem => String(elem[field]) === String(val));
  }

  processIdParam(param) {
    const end = param.indexOf("/", 1);
    const clearParam = param.substr(1, (end === -1 ? param.length : end) - 1);
    return !clearParam.length ? "" : clearParam;
  }

  auth(req) {
    return this.apiKey === req.headers['x-api-key'];
  }

  onGet(req, res, route, param) {
    // if (!this.auth(req))
    //   return [503, { 'Content-Type': 'text/plain' }, "not authorized"];

    let id = this.processIdParam(param);

    if (!id.length) // нет id -> отдаем все
      return [200, { 'Content-Type': 'application/json' }, JSON.stringify(this.data)];

    console.log(`getting id = ${id}`);

    const item = this.findBy("id", id);
    if (!item)
      return [404];

    return [200, { 'Content-Type': 'application/json' }, JSON.stringify(item)];
  }

  onDelete(req, res, route, param) {
    if (!this.auth(req))
      return [503, { 'Content-Type': 'text/plain' }, "not authorized"];

    let id = this.processIdParam(param);
    if (!id.length)
      return [400, { 'Content-Type': 'text/plain' }, "'id' expected"];

    const index = this.findByIndex("id", id);
    if (index === -1)
      return [400, { 'Content-Type': 'text/plain' }, `item with id = '${id}' not found`];

    this.data.splice(index, 1);

    console.log(`delete id = ${id}`);

    return [200];
  }

  onPut(req, res, route, param) {
    return this.standartDataProcess(req, res, param, "PUT");
  }

  onPost(req, res, route, param) {
    return this.standartDataProcess(req, res, param, "POST");
  }

  standartDataProcess(req, res, param, method) {
    if (!this.auth(req))
      return [503, { 'Content-Type': 'text/plain' }, "not authorized"];

    let id = this.processIdParam(param);
    if (!id.length)
      return [400, { 'Content-Type': 'text/plain' }, "'id' expected"];

    if (method === "POST") {
      if (this.findBy("id", id))
        return [400, { 'Content-Type': 'text/plain' }, `item '${id}' already exists`];

      console.log(`adding id = ${id}`);
    }

    if (method === "PUT")
      console.log(`updating id = ${id}`);

    let body = "";
    req.on('data', data => {
      body += data.toString();
    });

    req.on('end', () => {this.onJsonData(res, method, body)});
  }

  onJsonData(res, method, body) {
    let dataJson = {};
    let code = 0;
    let msg = "";

    try {
      dataJson = JSON.parse(body);

      if (method === "POST")
        this.data.push(dataJson);

      if (method === "PUT") {
        const index = this.findByIndex("id", dataJson.id);
        if (index === -1)
          throw new Error(`id = ${dataJson.id} not found!`);

        this.data[index] = {...dataJson};
      }
    }
    catch(err) {
      code = 400;
      msg = `bad data format : ${err.message}`
    }

    if (code === 0) { // нет ошибок
      code = 200;
      msg = "";
    }

    res.writeHead(code, { 'Content-Type': 'text/plain' });
    res.end(msg);
  }

  constructor(srvType, modPathName, listenOptions, serverConfig, headersConfig) {
    super(srvType, modPathName, listenOptions, {}, serverConfig, headersConfig);
    this.setRoutesConfig();
    this.apiKey = "YOUR_API_KEY";
    this.data = [];
  }
}

// const srvType = "node-fcgi";
// const modPathName = "/lib/node_modules/node-fastcgi"; // fcgi

const srvType = "http";
const modPathName = "node:http";

const listenOptions = {
  "port": 1221,
  // path: "/tmp/fastcgi.sock"
}

// enable cors
const headersConfig = [
  ['Origin', '*'],
  ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Headers', 'Authorization'],
  ['Access-Control-Allow-Credentials', 'true'],
  ['Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE'],
  ['Access-Control-Allow-Headers', 'Content-Type, x-api-key'],
  ['Access-Control-Max-Age', 86400]
];

new api(srvType, modPathName, listenOptions, {}, headersConfig).run();
