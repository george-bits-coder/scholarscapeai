import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Use the correct base URL
const API_BASE_URL = "https://scholarscapeai.onrender.com";

function resolveUrl(url: string) {
  // If URL already has http, return as is
  if (url.startsWith("http")) {
    return url;
  }

  // Remove trailing slashes and ensure proper joining
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  
  return `${base}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let errorMessage = `${res.status}: ${res.statusText || 'Unknown error'}`;
    
    try {
      if (contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // If not JSON, get text but limit length
        const text = await res.text();
        if (text.length < 200) {
          errorMessage = text;
        } else {
          // Try to extract title from HTML
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          errorMessage = titleMatch ? titleMatch[1] : `${res.status}: Server returned non-JSON response`;
        }
      }
    } catch (e) {
      // If we can't parse the response
      errorMessage = `${res.status}: ${res.statusText || 'Failed to parse response'}`;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = resolveUrl(url);
  console.log(`Making ${method} request to: ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      "Accept": "application/json" 
    } : {
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // This is correct
    mode: "cors", // Explicitly set CORS mode
  });

  // Log response for debugging
  console.log('Response status:', res.status);
  console.log('Response headers:', res.headers);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = resolveUrl(queryKey.join("/") as string);
    console.log(`Fetching from: ${url}`); // For debugging
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
    }
    
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});