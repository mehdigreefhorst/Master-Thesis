import {useRouter} from "next/navigation";
import {useCallback} from "react";

export interface LoginResponse {
  access_token: string,
  refresh_token: string,
}

export interface PaginatedResponse<T> {
  content: T[]
  size: number
  total_size: number
}

/**
 * Custom hook for the Capero backend authenticated fetch function. Prefixes the path with the backend base url, and properly adds the JSON body if it is not undefined.
 *
 * @param endpoint The API path, excluding the server base url.
 * @param method GET, POST, PUT, ...
 * @param body Optional, JSON request body.
 * @param additionalParameters Optional, parameters to pass to the fetch function.
 * @returns The response promise.
 */
export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(
    async (
      endpoint: string,
      {
        method = "GET",
        body = undefined,
        toSnakeCase = true,
        additionalParameters = undefined,
      }: {
        method?: string;
        body?: object;
        toSnakeCase?: boolean;
        additionalParameters?: RequestInit;
      } = {}
    ): Promise<Response> => {
      const access_token = sessionStorage.getItem("access_token");
      if (!access_token) {
        router.push("/login");
      }

      const requestInit: RequestInit = {
        ...additionalParameters,
        headers: {
          ...additionalParameters?.headers,
          Authorization: `Bearer ${access_token}`,
        },
      };

      // Execute the call and handle 401 responses
      try {
        const response = await unauthFetch(endpoint, {
          method,
          body,
          toSnakeCase,
          additionalParameters: requestInit,
        });

        if (response.status == 401) {
          const refreshed = await refresh();
          if (!refreshed) {
            router.push("/login");
            return response;
          } else {
            return authFetch(endpoint, {
              method,
              body,
              toSnakeCase,
              additionalParameters: requestInit,
            });
          }
        }

        return response;
      } catch (error) {
        return Promise.reject(error);
      }
    }, [router]);

  return authFetch;
}

/**
 * Capero backend UN-authenticated fetch function. Prefixes the path with the backend base url, and properly adds the JSON body if it is not undefined.
 *
 * @param endpoint The API path, excluding the server base url.
 * @param method GET, POST, PUT, ...
 * @param body Optional, JSON request body.
 * @param toSnakeCase Whether to make the body snake_case.
 * @param additionalParameters Optional, parameters to pass to the fetch function.
 * @returns The response promise.
 */
export function unauthFetch(
  endpoint: string,
  {
    method = "GET",
    body = undefined,
    toSnakeCase = true,
    additionalParameters = undefined,
  }: {
    method?: string;
    body?: object;
    toSnakeCase?: boolean;
    additionalParameters?: RequestInit;
  } = {}
): Promise<Response> {
  const backend_url = process.env.NEXT_PUBLIC_FLASK_API_URL;

  const requestInit: RequestInit = {
    method: method,
    ...additionalParameters,
    credentials: "include",
  };

  if (body !== undefined) {
    if (toSnakeCase) {
      requestInit.body = JSON.stringify(convertKeysToSnakeCase(body))
    } else {
      requestInit.body = JSON.stringify(body);
    }
    // Merge headers properly, ensuring Content-Type is set for JSON
    requestInit.headers = {
      ...(requestInit.headers || {}),
      "Content-Type": "application/json",
    };
  }

  return fetch(new URL(endpoint, backend_url), requestInit);
}

export function toSnakeCase(str: string): string {
  const result = str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  // Handle the case where the first letter was capitalized, so it has a prepended underscore now.
  if (result.charAt(0) == "_") {
    return result.substring(1);
  } else {
    return result;
  }
}

// Recursive function to convert an object's keys to snake_case
function convertKeysToSnakeCase(obj: object | object[]): object | object[] {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToSnakeCase(item));
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toSnakeCase(key),
        convertKeysToSnakeCase(value),
      ])
    );
  }
  return obj;
};

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Recursive function to convert an object's keys to camelCase
export function convertKeysToCamelCase(obj: object | object[]): object | object[] {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeysToCamelCase(item));
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        convertKeysToCamelCase(value),
      ])
    );
  }
  return obj;
};


async function refresh(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem("refresh_token");
  if (!refreshToken) {
    return false;
  }

  const headers = {
    "Authorization": `Bearer ${refreshToken}`
  }
  const response = await unauthFetch("/auth/refresh", {method: "POST", additionalParameters: {"headers": headers}});
  if (response.status == 200) {
    const response_body: LoginResponse = await response.json();
    sessionStorage.setItem("access_token", response_body.access_token);
    sessionStorage.setItem("refresh_token", response_body.refresh_token);
    return true;
  } else {
    return false;
  }
}