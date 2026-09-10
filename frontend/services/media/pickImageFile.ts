/**
 * Ouvre le selecteur de fichier natif du navigateur et resout le fichier
 * choisi (ou null si l'utilisateur annule). Web uniquement : l'appelant
 * doit verifier Platform.OS === "web" avant d'utiliser cette fonction.
 */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = () => {
      const fichier = input.files && input.files.length > 0 ? input.files[0] : null;
      resolve(fichier ?? null);
    };

    // Si l'utilisateur ferme la boite de dialogue sans choisir de fichier,
    // aucun evenement "change" ne se declenche : on ne bloque pas la
    // promesse indefiniment pour autant, l'appelant peut relancer.
    input.click();
  });
}
