import Link from "next/link";

export default function FicheNotFound() {
  return (
    <div className="px-6 py-16">
      <p className="text-[15px] font-medium text-encre-100">Établissement introuvable</p>
      <p className="mt-1 text-[13px] text-encre-60">
        Aucun établissement ne porte ce code, ou votre compte n&apos;a pas le droit de le voir.
      </p>
      <Link
        href="/etablissements"
        className="mt-4 inline-block text-[13px] text-navy-500 underline underline-offset-2 hover:text-navy-700"
      >
        ← Retour à la liste
      </Link>
    </div>
  );
}
