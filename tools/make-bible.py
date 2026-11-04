# Franco Vision — LA BIBLE (le plan d'affaires maître). Design system v3.
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK = RGBColor(0x11, 0x18, 0x27); MUTED = RGBColor(0x6B, 0x72, 0x80); FAINT = RGBColor(0x9C, 0xA3, 0xAF)
V = RGBColor(0x4D, 0x6B, 0xFE); GRAY = RGBColor(0x4B, 0x55, 0x63)
LOCKUP = "tools/logo-suite/franco-vision-lockup.png"

def rule(doc, color="4D6BFE", sz=6, space_after=8):
    p = doc.add_paragraph(); pPr = p._p.get_or_add_pPr(); pBdr = OxmlElement("w:pBdr")
    b = OxmlElement("w:bottom"); b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz)); b.set(qn("w:color"), color); b.set(qn("w:space"), "4")
    pBdr.append(b); pPr.append(pBdr); p.paragraph_format.space_after = Pt(space_after); return p

def para(doc, text="", size=9.5, color=INK, bold=False, align=None, space_after=4, space_before=0, line=1.18):
    p = doc.add_paragraph(); r = p.add_run(text)
    r.font.size = Pt(size); r.font.color.rgb = color; r.bold = bold
    if align is not None: p.alignment = align
    pf = p.paragraph_format; pf.space_after = Pt(space_after); pf.space_before = Pt(space_before); pf.line_spacing = line
    return p

def label(doc, text, space_before=10, space_after=4):
    p = doc.add_paragraph(); r = p.add_run(text.upper())
    r.font.size = Pt(8); r.bold = True; r.font.color.rgb = GRAY
    p.paragraph_format.space_before = Pt(space_before); p.paragraph_format.space_after = Pt(space_after); return p

def heading(doc, text, size=15, space_after=5):
    return para(doc, text, size=size, bold=True, space_after=space_after)

def bullet(doc, lead, rest, size=9.5):
    p = doc.add_paragraph()
    r1 = p.add_run("· " + lead); r1.bold = True; r1.font.size = Pt(size); r1.font.color.rgb = INK
    r2 = p.add_run(rest); r2.font.size = Pt(size); r2.font.color.rgb = MUTED
    p.paragraph_format.space_after = Pt(3); return p

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), hexcolor); tcPr.append(shd)

def cell_borders(cell, edges, color="E5E7EB", sz=4):
    tcPr = cell._tc.get_or_add_tcPr(); b = OxmlElement("w:tcBorders")
    for side in edges:
        el = OxmlElement("w:" + side); el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(sz)); el.set(qn("w:color"), color); b.append(el)
    tcPr.append(b)

def table3(doc, rows, widths=(2.0, 10.2, 5.0), header=("", "", "")):
    t = doc.add_table(rows=1, cols=3); t.autofit = False
    for i, htxt in enumerate(header):
        c = t.rows[0].cells[i]; c.width = Cm(widths[i]); shade(c, "F3F4F6")
        p = c.paragraphs[0]; r = p.add_run(htxt); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = MUTED
        p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    for a, b, c3 in rows:
        rw = t.add_row()
        for i, val in enumerate((a, b, c3)):
            c = rw.cells[i]; c.width = Cm(widths[i]); cell_borders(c, ["bottom"])
            p = c.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(9)
            p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
            if i == 0: r.bold = True; r.font.color.rgb = V
            elif i == 2: r.bold = True; r.font.color.rgb = INK
            else: r.font.color.rgb = INK
    return t

doc = Document()
s = doc.sections[0]
s.top_margin = Cm(1.4); s.bottom_margin = Cm(1.2); s.left_margin = Cm(1.6); s.right_margin = Cm(1.6)
st = doc.styles["Normal"]; st.font.name = "Arial"; st.font.size = Pt(9.5)
rPr = st.element.get_or_add_rPr(); rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None: rFonts = OxmlElement("w:rFonts"); rPr.append(rFonts)
for attr in ("ascii", "hAnsi", "cs"): rFonts.set(qn("w:" + attr), "Arial")
lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "fr-CA"); rPr.append(lang)

# ── Couverture ───────────────────────────────────────────────
t = doc.add_table(rows=1, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
t.columns[0].width = Cm(11.0); t.columns[1].width = Cm(6.8)
c0, c1 = t.rows[0].cells
p0 = c0.paragraphs[0]; p0.add_run().add_picture(LOCKUP, width=Cm(4.2))
p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r4 = p1.add_run("PLAN D'AFFAIRES MAÎTRE · v1.0"); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
rule(doc)
heading(doc, "FRANCO VISION — La Bible", size=22, space_after=4)
para(doc, "Le plan d'affaires maître de Franco Vision inc. — la société de logiciels née à Charlevoix pour la quatrième révolution industrielle. Ce document fusionne trois sources fondatrices (le plan Nikan, l'étude du secteur municipal québécois, l'étude des secteurs économiques de Charlevoix) avec tout ce que l'organisme a construit : le produit Le Veilleux, les sept organes, le standard EL FUEGO et la doctrine des deux mondes.", size=10, color=MUTED, space_after=8)

label(doc, "La vision", space_before=4)
heading(doc, "Une grande entreprise de logiciels, née et développée à Charlevoix — le lien humain entre l'IA et le territoire", size=14)
para(doc, "D'ici dix ans, Charlevoix accueillera un pôle régional d'intelligence artificielle : une entreprise qui dynamise l'économie locale, attire le talent, héberge une infrastructure souveraine (centres de données au Québec) et accueille des entreprises d'avant-garde en IA. Franco Vision est la graine de ce pôle — et chaque contrat d'aujourd'hui finance la racine de demain.")

label(doc, "La mission et la thèse")
bullet(doc, "La thèse (l'optique commerciale) : ", "la valeur n'est pas ce que l'IA génère, mais ce que le client CESSE de payer — les heures de conciliation, les amendes évitées, les 4 100 fonctionnaires québécois qui passent leur année à remplir des formulaires.")
bullet(doc, "La mission : ", "éliminer la friction entre l'humain et la machine — « l'humain au sommet, l'IA en soutien » — pour les PME, les travailleurs autonomes ET les administrations municipales.")
bullet(doc, "Les valeurs : ", "l'humain décide · la séparation des mondes (nos clés, nos données, jamais mélangées) · l'antifragilité (chaque erreur devient une leçon) · la souveraineté (Loi 25, données au Québec).")

label(doc, "Le fil conducteur des trois documents")
para(doc, "Les deux études indépendantes utilisent littéralement la MÊME métaphore que notre thèse fondatrice : « écrire un document à la main pour le retranscrire ensuite à l'ordinateur ». Le secteur municipal (328,4 M$ de fardeau annuel) et les PME (78 % ne voient pas l'utilité pratique de l'IA) souffrent du même mal : des processus de l'ère du papier numérisés en surface. Franco Vision vend la disparition de cette métaphore — l'agent qui exécute le flux de bout en bout, pendant que l'humain décide.")

label(doc, "L'organisme technologique (l'inventaire de la session)")
table3(doc, [
    ("Le Veilleux", "L'application : dashboard, caisse virtuelle + contre-registre (Z-rapport), journée d'ouverture/fermeture, alertes « la IA informe, le humain décide » (10 s, Non par défaut), centre de notifications à écran complet, pont Facebook/Messenger", "Produit"),
    ("Les 7 organes", "workflow-master, decision-router, accountability-auditor, autonomy-grader, audit (qui enseigne), forensics (qui explique), + le cerveau double (chat + reasoner)", "Moteur DSH"),
    ("EL FUEGO", "Le standard documenté de transfert de savoir humain-IA : 26 leçons réelles, le format canonique, le principe « adopter la logique complète des idées »", "Mémoire"),
    ("Les gardes", "Smoke strict, contrats du flux d'amorçage, garde CSS, parcours API complet, synchronisation du bundle — la qualité comme machine", "Qualité"),
    ("La doctrine des deux mondes", "Les clés et données du client ne se mélangent jamais avec les nôtres ; le Studio prépare, l'humain publie dans SES applications", "Souveraineté"),
], header=("Actif", "Ce que c'est", "Rôle"))

label(doc, "Le marché — la synthèse chiffrée des trois documents")
table3(doc, [
    ("Tourisme", "Été 2026 : 172,4 M$ de dépenses (+5,3 %), occupation 70,4 % ; Le Massif 72,6 M$ ; Club Med 21,8 M$ ; adoption IA : 1,9 % seulement", "Opportunité immense"),
    ("Municipal", "328,4 M$/an de fardeau administratif provincial ; 4 100 ETP ; quasi-monopole PG Solutions contesté (Marieville, 2026) ; concurrence IA = copilotes sans connaissance du territoire", "Gouvernement"),
    ("Tissu PME", "≈ 2 000 entreprises dans les deux MRC, 95 % de moins de 50 employés ; 14,1 % de travailleurs autonomes ; 32,8 % de la population a 65 ans et plus (relève d'entreprise)", "Base locale"),
    ("Conjoncture", "Octobre 2026 : les deux MRC réclament un statut particulier — Charlevoix devient le laboratoire idéal de l'IA agéntique", "Fenêtre unique"),
], header=("Segment", "Le fait (documenté)", "Lecture"))

label(doc, "La stratégie à deux voies (une thèse, deux marchés)")
heading(doc, "Voie A — Les PME et les secteurs économiques (Le Veilleux)", size=12)
bullet(doc, "Le produit : ", "l'assistant de travail installé chez le client (10 façons du guide : publications, courriels, devis, factures, actes, traduction, offres, agenda, avis, caisse) — une seule application, la cuisine invisible.")
bullet(doc, "La méthode des 8 semaines : ", "résultats rapides sur les données existantes + formation MFOR + mode ombre avant production (l'étude sectorielle).")
bullet(doc, "Les prix (3 niveaux) : ", "Niveau 1 « L'employé no 2 » 1 500 $ + 199–349 $/mois · Niveau 2 « Essaim sectoriel » 15 000–45 000 $ + 600–1 200 $/mois · Niveau 3 collectif/industriel.")
heading(doc, "Voie B — Le secteur municipal et régional (la couche d'orchestration agéntique)", size=12)
bullet(doc, "Le principe : ", "une couche agéntique souveraine PAR-DESSUS les systèmes existants (AccèsCité, GOnet, ePropriété) — on ne remplace pas le grand livre, on exécute les flux où le capital humain s'effondre.")
table3(doc, [
    ("Moteur 1", "Conformité géospatiale, hydrique et patrimoniale (urbanisme, CCU, ROPI) — l'enjambre de 3 sous-agents : vision CAD/BIM, géointelligence MELCCFP/SADR, compilateur normatif déterministe sans hallucinations", "Wedge Baie-Saint-Paul"),
    ("Moteur 2", "Agent forensique de conciliation financière et reddition TECQ/MAMH/CMQ — réimputation automatique des décomptes, dossiers pré-audités (NCMC 3530)", "Wedge <1 000 hab."),
    ("Moteur 3", "Orchestrateur de subventions et développement économique (SDLE, Mission développement, ESSOR 1A/1B/1C, patrimoine 218-26)", "Échelle MRC"),
    ("Moteur 4", "Gouvernance des TNO (Sagard, Mont-Élie), perception automatisée (2 $/visiteur, 2 $/nuit), mobilité rurale (Mobilité Charlevoix)", "Territoires publics"),
], header=("Produit", "Ce qu'il exécute", "Entrée"))

label(doc, "L'ingénierie financière (la règle d'or des subventions)")
para(doc, "Règle d'or : AUCUN contrat signé ni dépense engagée avant l'accusé de réception officiel de la demande de subvention — sinon le dossier est rejeté. Processus en 4 pas : diagnostic gratuit → soumission détaillée → dépôt + accusé → contrat et déploiement.", bold=True, space_after=4)
table3(doc, [
    ("Pour les clients", "EPRTNT 2025-2027 (50 % OBL / 80 % OBNL / 90 % autochtones, jusqu'à 200 000 $) · FRR Volet 4 (50 000 $ intermunicipal) · ESSOR 1A/1B/1C · MFOR (75 % formation) · Microcrédit Charlevoix (2,5 %, 6 mois sans paiement) · Volets 2-3 MRC (80–100 %)", "Le client paie 50–80 % de moins"),
    ("Pour Franco Vision", "C3i (25 %) · CDAE Volet IA (30 % des salaires, récurrent) · PARI-CNRC (jusqu'à 80 % des salaires internes) · CRIC (crédit remboursable 30 % sur le premier million)", "Le développement se finance"),
    ("L'offre légale", "LCOM 2026 : contrat <25 000 $ en gré à gré ; 25 000–138 999 $ par invitation (2 fournisseurs, 8 jours) ; services (jamais « biens ») pour garder le seuil de 139 000 $ ; avis d'intention SEAO pour l'exclusivité", "Entrée sans appel d'offres de 18 mois"),
], header=("Instrument", "Le détail", "L'effet"))

label(doc, "Le modèle d'affaires et la viabilité")
bullet(doc, "Viabilité (plan Nikan) : ", "86 000 – 96 000 $/an — charges ≈ 36 350 $ + salaire du fondateur 50 000–60 000 $ ; atteinte avec 2–3 implantations + 3–4 accompagnements actifs.")
bullet(doc, "La servitisation 5.0 : ", "la majorité des revenus à maturité vient de l'accompagnement mensuel récurrent (le forfait devient l'actif).")
bullet(doc, "Le pilote antifragile : ", "6 mois à tarif opérationnel, aucune projection non validée — le pilote EST le moteur de toutes les données futures.")

label(doc, "La feuille de route — trois horizons fusionnés")
table3(doc, [
    ("H1 · mois 1–6", "Nœud opérationnel à Charlevoix (crédits C3i/CDAE/PARI) · contrats wedge municipaux en gré à gré (<25 000 $) à Baie-Saint-Paul, La Malbaie, Petite-Rivière-Saint-François · pilote PME (8 semaines) · one-pager + guide + accord de pilote", "Premiers revenus réels"),
    ("H2 · mois 6–18", "Accord intermunicipal FRR Volet 4 (50 000 $) · orchestration SDLE/Mission développement · essaims sectoriels (ESSOR 1B/1C) · embauche conditionnelle « un poste = un revenu confirmé »", "Échelle MRC"),
    ("H3 · mois 18–36", "Validation sur les 13 municipalités et 3 TNO → escalade vers 86 MRC et 1 100 municipalités (FQM, UMQ, ADMQ) · connecteurs MAMH/MELCCFP (contrats de services <139 000 $)", "Standard québécois"),
], header=("Horizon", "Les actions", "Le résultat"))

label(doc, "La vision à dix ans — le pôle régional")
para(doc, "Franco Vision devient le noyau d'un écosystème : l'infrastructure souveraine (centres de données au Québec, énergie Hydro-Québec, conformité Loi 25 par conception) attire les entreprises d'IA d'avant-garde qui cherchent une base canadienne fiable ; le talent local et le télétravail régional trouvent un employeur technologique sans quitter Charlevoix ; les jeunes de la région voient une carrière en IA née chez eux. Le Groupe Le Massif et le Club Med prouvent qu'un pôle d'excellence mondial peut vivre à Charlevoix — Franco Vision ajoute la couche technologique manquante.")

label(doc, "Les risques et la mitigation")
table3(doc, [
    ("Adoption lente", "78 % des PME ne voient pas l'utilité — mitigation : la méthode des 8 semaines, résultats sur leurs données, formation MFOR", "Contrôlé"),
    ("Annulations (40 %, Gartner 2027)", "Mitigation : le pilote opérationnel + l'accompagnement continu comme cœur du modèle", "Contrôlé"),
    ("Quasi-monopole PG Solutions", "On ne le remplace pas : on orchestre PAR-DESSUS — migration zéro pour le client", "Contourné"),
    ("Hallucinations normatives", "Le compilateur déterministe (graphe juridique) au lieu de la mémoire LLM — la doctrine « la IA informe, l'humain décide »", "Éliminé"),
    ("Loi 25 / deontologie OUQ", "Souveraineté par conception : données au Québec, AES-256, pseudonymisation en bordure, EFVP", "Barrière d'entrée"),
], header=("Risque", "Mitigation", "Statut"))

label(doc, "La demande (les partenaires et l'appui)")
bullet(doc, "SADC Charlevoix : ", "accompagnement, mise en relation avec la PME pilote, aide aux demandes de subventions, prêt conditionnel (25 000 $).")
bullet(doc, "Les canaux documentés : ", "SDLE de la MRC de Charlevoix (sdle@mrccharlevoix.ca) · Mission développement Charlevoix (infofinancement@mrccharlevoixest.ca) · Chambre de commerce (cohortes MFOR, 10 % de gestion pour l'organisme) · Tourisme Charlevoix (EPRTNT) · Table agroalimentaire.")
bullet(doc, "Le futur proche : ", "le FRR Volet 4 pour l'accord intermunicipal ; C3i/CDAE/PARI pour l'équipe ; le conseil consultatif post-pilote (PME, comptable, expert IA, représentant autochtone, ex-SADC).")

label(doc, "Le système d'exploitation de l'entreprise")
para(doc, "L'entreprise fonctionne comme le produit : le lazo « agir → vérifier → noter → consolider → archiver ». L'organe audit fait la revue hebdomadaire et enseigne ; le forensics explique le passé ; le feu-log conserve chaque leçon. Les gardes de qualité empêchent la régression. Une seule règle de gestion : un poste = un revenu confirmé ; une intégration = une demande client. La Bible est ce document — elle se met à jour à chaque horizon franchi.")

rule(doc, color="E5E7EB", sz=4, space_after=4)
para(doc, "Franco Vision inc. · Charlevoix, Québec · La Bible v1.0 · Novembre 2026 · Sources : plan Nikan v5.2, étude municipale (34 p.), étude sectorielle (47 p.), et la session de construction complète", size=7.5, color=FAINT, align=WD_ALIGN_PARAGRAPH.CENTER)

out = sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-BIBLE.docx"
doc.save(out)
print("saved", out)
