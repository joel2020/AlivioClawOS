const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000/api/v1";

export async function fetchAPI(path: string) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
