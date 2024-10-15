import * as fetchImport from 'isomorphic-fetch';
const fetch = (fetchImport.default || fetchImport) as typeof fetchImport.default;

type ResponseHeadersForEach = (value: string, key: string) => void;

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    forEach: (callback: ResponseHeadersForEach) => void;
  };
  text: () => Promise<string>;
};

enum HttpVerb {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestHeaders = {
  'content-type': 'application/vnd.api+json';
  [k: string]: string;
};

type RequestOptions = {
  method: HttpMethod;
  headers: RequestHeaders;
  body?: string;
  progress?: any
};

export type ResponsePayload = {
  status: number;
  statusText: string;
  headers: object;
  data?: object | undefined;
};

export type HttpResponse = Promise<ResponsePayload>;

export type HttpAdapterConstructor = {
  host?: string;
  baseURL?: string;
  namespace?: string;
  headers?: object;
  onErrorCallback?: (errors: ResponsePayload) => void;
};

interface HttpAdapterInterface {
  host: string;
  namespace: string;
  headers: RequestHeaders;
  get(url: string): HttpResponse;
  post(url: string, data: object): HttpResponse;
  put(url: string, data: object): HttpResponse;
  patch(url: string, data: object): HttpResponse;
  delete(url: string): HttpResponse;
  onErrorCallback?: (errors: ResponsePayload) => void;
}

class HttpAdapter implements HttpAdapterInterface {
  host: string;
  namespace: string;
  headers: RequestHeaders;
  onErrorCallback?: (errors: ResponsePayload) => void;

  constructor(args: HttpAdapterConstructor = {}) {
    this.host = args.host || args.baseURL || '';
    this.namespace = args.namespace || '';
    this.headers = {
      'content-type': 'application/vnd.api+json',
      ...args.headers,
    };
    if(args.onErrorCallback) {
      this.onErrorCallback = args.onErrorCallback;
    }
  }

  runCallBack(errors: ResponsePayload): void {
    this.onErrorCallback(errors);
  }

  extractResponseHeaders(response: FetchResponse): object {
    const object = {};
    response.headers.forEach((value, key) => {
      object[key] = value;
    });
    return object;
  }

  request(method: HttpMethod, url: string, data?: object, extraOptions?: any): HttpResponse {
    const appendLiveSurvey: boolean = (extraOptions && extraOptions.appendLiveSurvey) || false;
    const endpoint: string = appendLiveSurvey ? this.host.replace('/api/v1', '/survey/v1') + this.namespace + url  : this.host + this.namespace + url;
    // const endpoint: string = this.host + this.namespace + url;
    const options: RequestOptions = {
      method,
      headers: this.headers,
      progress: (e) => {
        if(extraOptions && extraOptions.onProgress) {
          extraOptions.onProgress(e)
        }
      }
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return fetch(endpoint, options).then((response: FetchResponse) => {
      const payload: ResponsePayload = {
        status: response.status,
        statusText: response.statusText,
        headers: this.extractResponseHeaders(response),
      };
      return response.text().then((text) => {
        try {
          payload.data = JSON.parse(text);
        } catch (err) {
          this.runCallBack(payload);
          payload.data = undefined;
        } finally {
          if (response.ok) {
            return payload;
          }
          this.runCallBack(payload);
          throw payload;
        }
      });
    });
  }

  get(url: string): HttpResponse {
    return this.request(HttpVerb.Get, url);
  }

  post(url: string, data: object): HttpResponse {
    return this.request(HttpVerb.Post, url, data);
  }

  put(url: string, data: object): HttpResponse {
    return this.request(HttpVerb.Put, url, data);
  }

  patch(url: string, data: object): HttpResponse {
    return this.request(HttpVerb.Patch, url, data);
  }

  delete(url: string): HttpResponse {
    return this.request(HttpVerb.Delete, url);
  }
}

export default HttpAdapter;
