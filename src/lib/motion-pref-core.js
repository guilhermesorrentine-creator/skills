// Regra pura da preferência de movimento (testável sem React).
export function resolveReduced(choice, systemReduced) {
  return choice === "reduced" || (choice === "system" && systemReduced);
}
