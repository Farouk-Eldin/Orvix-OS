// PROPOSAL — target path: sdk/orvix-node/src/client.ts (new package)
//
// Wraps exactly the public endpoints that exist today:
//   GET /api/public/v1/customers
// No speculative methods for endpoints that don't exist yet — adding a
// new public route later means adding one method here, not redesigning
// the client.

export interface OrvixClientOptions {
  apiKey: string;
  baseUrl?: string; // defaults to the production API
}

export interface OrvixCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: string;
}

export interface ListCustomersParams {
  search?: string;
  page?: number;
  [key: string]: string | number | undefined;
}

export interface ListCustomersResult {
  customers: OrvixCustomer[];
  total: number;
  page: number;
  pageSize: number;
}

export class OrvixApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "OrvixApiError";
  }
}

export class OrvixClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: OrvixClientOptions) {
    if (!options.apiKey?.startsWith("ovx_live_")) {
      throw new Error("مفتاح API غير صحيح — لازم يبدأ بـ ovx_live_");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.orvixos.com").replace(/\/$/, "");
  }

  private async request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new OrvixApiError(body.message ?? `Request failed with status ${response.status}`, response.status);
    }

    return body.data as T;
  }

  customers = {
    list: (params?: ListCustomersParams) => this.request<ListCustomersResult>("/api/public/v1/customers", params),
  };
}
