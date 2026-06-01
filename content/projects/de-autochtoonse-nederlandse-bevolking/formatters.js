export const formatNumber = new Intl.NumberFormat("nl-NL");
export const formatOne = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
export const formatSigned = new Intl.NumberFormat("nl-NL", {
	signDisplay: "exceptZero",
	maximumFractionDigits: 0,
});

export function people(value) {
	return Number.isFinite(value) ? `${formatNumber.format(value)} personen` : "-";
}

export function signedPeople(value) {
	return Number.isFinite(value) ? `${formatSigned.format(value)} personen` : "-";
}

export function homes(value) {
	return Number.isFinite(value) ? `${formatNumber.format(value)} woningen` : "-";
}

export function percent(value) {
	return Number.isFinite(value) ? `${formatOne.format(value)}%` : "-";
}

export function mw(value) {
	return Number.isFinite(value) ? `${formatOne.format(value)} MW` : "-";
}

export function requests(value) {
	return Number.isFinite(value) ? `${formatNumber.format(value)} verzoeken` : "-";
}

export function percentTick(value) {
	return `${formatOne.format(value)}%`;
}

export function formatMetric(key, value) {
	if (!Number.isFinite(value)) return "-";
	if (key.includes("Mw")) return mw(value);
	if (key.includes("Requests")) return requests(value);
	if (key === "housingShortagePct" || key.endsWith("PctPopulation")) return percent(value);
	if (key === "netMigration" || key === "birthSurplus" || key === "cumulativeNetMigration") return signedPeople(value);
	if (
		key === "population" ||
		key === "liveBirths" ||
		key === "deaths" ||
		key === "populationMinusNetMigration" ||
		key === "cumulativeImmigration" ||
		key === "immigration" ||
		key === "emigration" ||
		key === "bornAbroadPopulation" ||
		key === "nativeBackgroundProxy" ||
		key === "migrationBackgroundTotal" ||
		key === "firstGenerationMigrationBackground" ||
		key === "secondGenerationMigrationBackground" ||
		key === "secondGenerationOneParentAbroad" ||
		key === "secondGenerationBothParentsAbroad" ||
		key === "bornAbroadDutchParents" ||
		key.startsWith("origin") ||
		key.startsWith("emigration")
	)
		return people(value);
	if (key === "newHomes" || key === "netHousingStockGrowth" || key === "housingShortage" || key === "housingStock") return homes(value);
	return formatNumber.format(value);
}

export function shortNumber(value) {
	const abs = Math.abs(value);
	if (abs >= 1000000) return `${formatOne.format(value / 1000000)} mln`;
	if (abs >= 1000) return `${formatOne.format(value / 1000)}k`;
	return formatNumber.format(value);
}
