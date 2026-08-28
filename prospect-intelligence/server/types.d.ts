declare module 'node-fetch' {
  interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: 'follow' | 'manual' | 'error';
  }

  interface FetchResponse {
    ok: boolean;
    status: number;
    text(): Promise<string>;
    json(): Promise<any>;
  }

  function fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;
  export default fetch;
}
