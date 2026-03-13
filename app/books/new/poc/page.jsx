import { redirect } from "next/navigation";

export default function NewBookPocRedirectPage() {
  redirect("/books/new");
}
