import { redirect } from "next/navigation";

/*
  LANDING ROUTE — Products.

  It used to land on Insights, on the reasoning that the action board is what
  needs you today. Products is the better first screen: it is the catalogue,
  it is the first item in the nav, and it answers "what am I looking at"
  before Insights answers "what should I do about it". Opening on a triage
  board assumes the reader already has the context the catalogue gives them.
*/
export default function RootPage() {
  redirect("/products");
}
