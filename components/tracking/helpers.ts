export function getPageCategory(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/cars/")) return "vehicle_detail";
  if (pathname.startsWith("/compare")) return "comparison";
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/recommend")) return "recommendation";
  if (pathname.startsWith("/blog")) return "content";
  if (pathname.startsWith("/appointment")) return "consultation";
  if (pathname.startsWith("/assistant")) return "assistant";
  if (pathname.startsWith("/admin")) return "admin";
  return "other";
}
