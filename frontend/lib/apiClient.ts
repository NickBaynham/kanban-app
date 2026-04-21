export const API_BASE = "/api";

export function getAuthToken() {
    if (typeof window !== "undefined") {
        return localStorage.getItem("token");
    }
    return null;
}

export function setAuthToken(token: string | null) {
    if (typeof window !== "undefined") {
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
    }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });
    
    if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
        setAuthToken(null);
        window.location.href = "/login";
    }
    
    return response;
}
