import { UnitType, UnitClassification } from "../types/enums";

// Drives the frontend's unit-type dropdown filtering (residential vs.
// commercial unit types shouldn't mix) and provides a single source of
// truth for human-readable labels, rather than duplicating this mapping
// in multiple components.
export const UNIT_TYPE_METADATA: Record<UnitType, { label: string; classification: UnitClassification }> = {
  [UnitType.BEDSITTER]: { label: "Bedsitter", classification: UnitClassification.RESIDENTIAL },
  [UnitType.ONE_BEDROOM]: { label: "1 Bedroom", classification: UnitClassification.RESIDENTIAL },
  [UnitType.TWO_BEDROOM]: { label: "2 Bedroom", classification: UnitClassification.RESIDENTIAL },
  [UnitType.THREE_BEDROOM]: { label: "3 Bedroom", classification: UnitClassification.RESIDENTIAL },
  [UnitType.MAISONETTE]: { label: "Maisonette", classification: UnitClassification.RESIDENTIAL },
  [UnitType.SHOP]: { label: "Shop", classification: UnitClassification.COMMERCIAL },
  [UnitType.OFFICE]: { label: "Office", classification: UnitClassification.COMMERCIAL },
  [UnitType.WAREHOUSE]: { label: "Warehouse", classification: UnitClassification.COMMERCIAL },
  [UnitType.SHOWROOM]: { label: "Showroom", classification: UnitClassification.COMMERCIAL },
};

export function getUnitTypesForClassification(classification: UnitClassification): UnitType[] {
  return Object.entries(UNIT_TYPE_METADATA)
    .filter(([, meta]) => meta.classification === classification)
    .map(([type]) => type as UnitType);
}
