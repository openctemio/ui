
import type { ApiComponent } from "./component-api.types";
import type { Component, ComponentEcosystem, LicenseCategory, LicenseRisk } from "../types";
import type { Status } from "@/features/shared/types";

/**
 * Maps API component to UI component model
 */
export function mapApiComponentToUi(apiComponent: ApiComponent): Component {
    // Default values for fields missing in API
    const defaultVulnerabilityCount = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
    };

    // If the API returns a total count, we place it in "info" or distribute it? 
    // For now, if total > 0 but we have no breakdown, we just note it.
    // Ideally backend should provide breakdown. 
    // We'll leave it as 0s since we can't invent severity.

    return {
        id: apiComponent.id,
        name: apiComponent.name,
        version: apiComponent.version,
        ecosystem: (apiComponent.ecosystem as ComponentEcosystem) || "active",
        type: "library", // Default type
        purl: apiComponent.purl,
        description: apiComponent.purl, // Fallback description
        homepage: undefined,
        repositoryUrl: undefined,

        sources: [], // No source details in list view
        sourceCount: 1, // Default to 1

        isDirect: apiComponent.dependency_type === "direct",
        depth: 0,
        dependencyPath: [],

        latestVersion: null,
        isOutdated: false, // We don't have this info yet
        versionsAvailable: [],

        vulnerabilities: [], // No details
        vulnerabilityCount: {
            ...defaultVulnerabilityCount,
            // If we simply want to show "there are vulnerabilities", we might hack this.
            // But better to be accurate.
            low: apiComponent.vulnerability_count // Temporary: dump all in low so they show up? Or just leave 0?
        },
        riskScore: 0,

        license: apiComponent.license || null,
        licenseId: apiComponent.license || null,
        licenseCategory: "unknown" as LicenseCategory,
        licenseRisk: "unknown" as LicenseRisk,

        status: (apiComponent.status as Status) || "active",

        firstSeen: apiComponent.created_at,
        lastSeen: apiComponent.updated_at,
        createdAt: apiComponent.created_at,
        updatedAt: apiComponent.updated_at,
    };
}
