/**
 * Required MITRE ATT&CK attribution notice. Rendered wherever ATT&CK
 * technique / tactic / mitigation ids are displayed.
 */
export function MitreFooter() {
  return (
    <p className="text-muted-foreground mt-6 text-xs">
      &copy; The MITRE Corporation. ATT&amp;CK&reg; is a registered trademark of The MITRE
      Corporation. ATT&amp;CK technique, tactic, and mitigation identifiers are reproduced with
      permission.
    </p>
  )
}
