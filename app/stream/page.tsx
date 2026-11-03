import { redirect } from "next/navigation";

/** Legacy / marketing alias for the go-live entry. */
export default function StreamAliasPage() {
  redirect("/go-live");
}
