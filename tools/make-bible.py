# Franco Vision — PLAN D'AFFAIRES v3 (Nikan discipline: facts with verifiable links, no over-promising).
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.opc.constants import RELATIONSHIP_TYPE

INK = RGBColor(0x11, 0x18, 0x27); MUTED = RGBColor(0x6B, 0x72, 0x80); FAINT = RGBColor(0x9C, 0xA3, 0xAF)
V = RGBColor(0x4D, 0x6B, 0xFE); GRAY = RGBColor(0x4B, 0x55, 0x63)
LOCKUP = "tools/logo-suite/franco-vision-lockup.png"

def add_hyperlink(paragraph, text, url, size=9):
    part = paragraph.part
    r_id = part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hl = OxmlElement("w:hyperlink"); hl.set(qn("r:id"), r_id)
    run = OxmlElement("w:r"); rPr = OxmlElement("w:rPr")
    c = OxmlElement("w:color"); c.set(qn("w:val"), "4D6BFE"); rPr.append(c)
    u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rPr.append(u)
    sz = OxmlElement("w:sz"); sz.set(qn("w:val"), str(int(size * 2))); rPr.append(sz)
    run.append(rPr)
    t_el = OxmlElement("w:t"); t_el.text = text; run.append(t_el)
    hl.append(run); paragraph._p.append(hl)

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

def cite(doc, text, url, size=9):
    p = doc.add_paragraph(); add_hyperlink(p, text, url, size=size)
    p.paragraph_format.space_after = Pt(2); return p

def section(doc, num, title, audience, size=14):
    para(doc, "SECTION " + num, size=8, color=V, bold=True, space_before=12, space_after=1)
    para(doc, title, size=size, bold=True, space_after=2)
    p = doc.add_paragraph()
    r = p.add_run("À lire par : " + audience)
    r.font.size = Pt(8.5); r.font.color.rgb = GRAY; r.italic = True
    p.paragraph_format.space_after = Pt(4)
    rule(doc, color="E5E7EB", sz=4, space_after=6)

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

def table3(doc, rows, widths=(2.2, 10.0, 5.0), header=("", "", "")):
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
r4 = p1.add_run("PLAN D'AFFAIRES · v3.0"); r4.font.size = Pt(8); r4.bold = True; r4.font.color.rgb = MUTED
rule(doc)
para(doc, "FRANCO VISION — Plan d'affaires", size=21, bold=True, space_after=4)
para(doc, "L'IA travaille. L'humain veille, décide, révise.", size=13, bold=True, color=V, space_after=4)
para(doc, "Franco Vision est le maillon humain entre l'intelligence artificielle et les entreprises de Charlevoix — celles qui n'ont ni le temps ni les ressources techniques pour l'implanter elles-mêmes. Notre discipline : ne jamais surpromettre ni sous-livrer. Le pilote de 6 mois valide chaque promesse avant qu'elle ne devienne un engagement.", size=10, color=MUTED, space_after=10)

# ── Sommaire ─────────────────────────────────────────────────
section(doc, "SOMMAIRE", "Sommaire et guide de lecture", "Tout le monde — 2 minutes")
table3(doc, [
    ("1", "Pourquoi maintenant — le constat et le rôle du maillon humain", "L'entrepreneur"),
    ("2", "Le marché — les indicateurs, pas des promesses", "L'entrepreneur + conseiller"),
    ("3", "L'offre — les services et le produit", "La direction"),
    ("4", "Le modèle d'affaires et la viabilité", "L'entrepreneur + comptable"),
    ("5", "L'aide financière disponible (clients et entreprise)", "Délégable : comptable"),
    ("6", "La feuille de route — le pilote d'abord", "La direction"),
    ("7", "Les risques et leur mitigation", "La direction + conseil"),
    ("8", "La demande — partenaires et appui", "La direction + SADC"),
    ("9", "L'organisme technologique", "Délégable : directeur technique"),
    ("10", "Sources et références (liens vérifiables)", "Délégable : analystes"),
], header=("No", "Section", "À lire par"))

# ── 1. POURQUOI MAINTENANT ───────────────────────────────────
section(doc, "1", "Pourquoi maintenant — le constat et le rôle du maillon humain", "L'entrepreneur d'abord")
para(doc, "L'intelligence artificielle a changé de nature. La première génération — les robots conversationnels — répondait aux questions. La génération actuelle — les agents — exécute des tâches complètes : rédiger, classer, concilier, alerter. Ce basculement est la quatrième révolution industrielle.")
para(doc, "L'histoire offre un précédent rassurant : la troisième révolution (l'informatique) n'a pas transformé les PME le jour où les ordinateurs ont été inventés, mais le jour où ils sont devenus assez simples pour qu'un propriétaire d'entreprise les utilise sans ingénieur. La même transition se répète aujourd'hui avec l'IA : il manque le maillon humain qui rend la technologie simple, locale et digne de confiance. Ce maillon, c'est Franco Vision.")
bullet(doc, "Le constat : ", "beaucoup d'entreprises savent que l'IA existe, peu savent quoi en faire — et une part surprenante l'utilise déjà sans le savoir (les sources sont en section 2).")
bullet(doc, "La prudence assumée : ", "l'arrivée d'une technologie suscite toujours une surestimation et des attentes élevées ; les entreprises technologiques promettent souvent plus qu'elles ne peuvent livrer. Notre protection contre ce piège : l'antifragilité comme discipline — surpromettre et sous-livrer fait perdre la confiance des partenaires institutionnels et financiers, et nous ne le ferons pas.")
bullet(doc, "La méthode : ", "un pilote de 6 mois à tarif opérationnel comme socle de toute projection. Aucune promesse non validée sur le terrain ; chaque chiffre de ce plan est un indicateur à vérifier, jamais une garantie.")

# ── 2. MARCHÉ ────────────────────────────────────────────────
section(doc, "2", "Le marché — les indicateurs, pas des promesses", "L'entrepreneur + le conseiller")
para(doc, "Les indicateurs suivants proviennent de sources publiques vérifiables. Ils décrivent le contexte ; ils ne constituent pas une promesse de revenus.", size=8.5, color=GRAY, italic=True, space_after=4)
bullet(doc, "Adoption de l'IA au Canada et au Québec : ", "l'adoption progresse, mais une étude de la BDC révèle que 27 % des entreprises canadiennes ignorent qu'elles utilisent déjà de l'IA — un manque d'accompagnement structuré, qui est précisément notre marché.")
cite(doc, "BDC — Étude sur l'adoption de l'IA par les entreprises canadiennes", "https://www.bdc.ca/fr/a-propos/recherche-analyses")
cite(doc, "Statistique Canada — Analyse de l'utilisation de l'IA par les entreprises au Canada", "https://www150.statcan.gc.ca/n1/fr/type/donnees?MM=1")
cite(doc, "Statistique Québec — Adoption de l'IA par les entreprises au Québec", "https://statistique.quebec.ca/fr")
bullet(doc, "Le fardeau administratif municipal : ", "une étude Raymond Chabot Grant Thornton pour l'Union des municipalités du Québec (2025) évalue le coût annuel du fardeau administratif provincial pour les municipalités à 328,4 M$, soit l'équivalent de plus de 4 100 employés à temps plein.")
cite(doc, "UMQ — Étude sur le fardeau administratif des municipalités (RCGT, 2025)", "https://umq.qc.ca/")
bullet(doc, "Le territoire de Charlevoix : ", "deux MRC, près de 30 000 habitants permanents et environ 2 000 entreprises actives, dont près de 95 % comptent moins de 50 employés.")
cite(doc, "MRC de Charlevoix — Mission et portrait du territoire", "https://www.mrccharlevoix.ca/")
cite(doc, "MRC de Charlevoix-Est — Portrait et services", "https://www.mrccharlevoixest.ca/")
cite(doc, "Tourisme Charlevoix — Bilans et données touristiques", "https://www.tourisme-charlevoix.com/")
bullet(doc, "L'écosystème d'appui : ", "SADC, Chambre de commerce, SDLE, Mission développement Charlevoix et Tourisme Charlevoix accompagnent déjà les entreprises — nous arrivons comme le maillon technologique local.")
cite(doc, "SADC Charlevoix — Services aux entreprises", "https://www.sadc-cae.ca/")
cite(doc, "Chambre de commerce de Charlevoix", "https://www.creezdesliens.com/")

# ── 3. OFFRE ─────────────────────────────────────────────────
section(doc, "3", "L'offre — les services et le produit", "La direction")
para(doc, "L'offre suit le parcours du client, du premier contact à l'accompagnement continu — avec l'humain au sommet de la pyramide décisionnelle à chaque étape.")
table3(doc, [
    ("Étape 0", "Rencontre découverte et estimation écrite — gratuites (1 à 3 heures, sur place)", "0 $"),
    ("Service 1", "Évaluation de la préparation à l'IA : diagnostic des données, des outils et des goulots ; feuille de route stratégique", "Inclus"),
    ("Service 2", "Implantation et automatisation — tarification par problème à résoudre (publications, comptabilité, administration, service client)", "1 500–4 000 $"),
    ("Service 3", "Intégration des outils existants (Microsoft 365, Google Workspace, ChatGPT…) et formation du personnel", "750 $/jour"),
    ("Service 4", "Accompagnement continu — le cœur du modèle : le client reste maître de ses outils, avec un partenaire stable", "249–449 $/mois"),
    ("Service 5", "Ateliers, conférences et formations — avec la Chambre de commerce, la SADC et les associations sectorielles", "750–1 200 $"),
    ("Le produit", "Le Veilleux : l'assistant de travail installé chez le client — caisse, contre-registre (Z-rapport), journée d'ouverture/fermeture, alertes et centre de notifications « la IA informe, l'humain décide »", "SaaS"),
], header=("Offre", "Ce que c'est", "Tarif"))

# ── 4. MODÈLE + VIABILITÉ ───────────────────────────────────
section(doc, "4", "Le modèle d'affaires et la viabilité", "L'entrepreneur + le comptable")
bullet(doc, "La viabilité : ", "86 000 – 96 000 $/an : charges annuelles ≈ 36 350 $ + salaire du fondateur de 50 000 à 60 000 $. Atteinte avec un nombre raisonnable de contrats — trois scénarios simples dans le plan du fondateur, à valider rigoureusement par le pilote.")
bullet(doc, "La servitisation 5.0 : ", "à maturité, la majorité des revenus provient de l'accompagnement mensuel récurrent — le forfait devient l'actif.")
bullet(doc, "Le pilote antifragile : ", "6 mois à tarif opérationnel (couvre uniquement les frais) ; mécanisme « test – rétroaction – ajustement » ; à la fin : reconduction au tarif commercial ou sortie sans frais cachés.")
bullet(doc, "L'embauche conditionnelle : ", "un poste = un revenu confirmé. Aucun recrutement sur projection.")

# ── 5. AIDE FINANCIÈRE ──────────────────────────────────────
section(doc, "5", "L'aide financière disponible (clients et entreprise)", "Délégable : comptable")
para(doc, "Règle d'or commune à la plupart des programmes publics : aucun contrat signé ni dépense engagée avant l'accusé de réception officiel de la demande. Processus : diagnostic gratuit → soumission détaillée → dépôt et accusé → contrat et déploiement.", bold=True, space_after=4)
table3(doc, [
    ("Clients", "ESSOR (Investissement Québec, volets 1B/1C) · PARI-CNRC · PCAN (jusqu'à 15 000 $) · BDC LIFT (500 M$) · programmes régionaux des MRC (FLI/FLS) · Microcrédit Charlevoix", "Le client paie moins"),
    ("Entreprise", "Crédit d'impôt CRIC (30 % remboursable sur le premier million) · CDAE Volet IA · C3i · Futurpreneur (jusqu'à 60 000 $)", "Le développement se finance"),
    ("Cadre légal", "Loi sur les contrats des organismes municipaux (LCOM, 2026) : adjudication directe sous 25 000 $ — les contrats de services gardent un seuil plus élevé que les biens", "Entrée progressive"),
], header=("Instrument", "Le détail", "L'effet"))
cite(doc, "Investissement Québec — Programme ESSOR", "https://www.investquebec.com/quebec/fr/produits-et-services/programmes-financiers")
cite(doc, "CNRC — PARI", "https://nrc.canada.ca/fr/soutien-linnovation-technologique/programme-daide-recherche-industrielle")
cite(doc, "BDC — Programme LIFT", "https://www.bdc.ca/fr/financement/programmes-speciaux/lift")
cite(doc, "Revenu Québec — Crédit d'impôt CRIC et CDAE", "https://www.revenuquebec.ca/fr/entreprises/credits/")
cite(doc, "Futurpreneur Canada", "https://www.futurpreneur.ca/fr/")
cite(doc, "Microcrédit Charlevoix", "https://www.microcreditcharlevoix.ca/")
cite(doc, "Gouvernement du Québec — Loi 25 (protection des renseignements personnels)", "https://www.quebec.ca/gouvernement/travailler-gouvernement/emplois-secteur-public/protection-renseignements-personnels")

# ── 6. FEUILLE DE ROUTE ─────────────────────────────────────
section(doc, "6", "La feuille de route — le pilote d'abord", "La direction")
table3(doc, [
    ("Trimestre 1", "Structuration interne : incorporation (Franco Vision inc.), comptabilité, assurances ; dépôt du plan à la SADC ; signature de l'entente de phase pilote avec une PME locale", "Préparation"),
    ("Trimestres 2-3", "Phase pilote de 6 mois : diagnostic complet, implantations ciblées, mesure systématique (heures économisées, productivité, satisfaction), cas d'étude chiffré validé par le dirigeant", "Données réelles"),
    ("Trimestre 4", "Premier client commercial au tarif de la grille ; lancement public ; demande d'appui conditionnelle aux résultats du pilote", "Validation"),
    ("Au-delà", "Accords intermunicipaux et secteur public — seulement après validation sur le terrain, avec la même discipline de pilote", "Échelle"),
], header=("Période", "Les actions", "Le résultat"))

# ── 7. RISQUES ───────────────────────────────────────────────
section(doc, "7", "Les risques et leur mitigation", "La direction + le conseil consultatif")
table3(doc, [
    ("Surestimation / sous-livraison", "La discipline antifragile : le pilote valide chaque promesse avant tout engagement public", "Structurel"),
    ("Adoption lente", "Résultats rapides sur les données existantes du client + formation pratique (MFOR)", "Contrôlé"),
    ("Concurrence", "Positionnement local et humain : le maillon entre l'IA et le propriétaire — la proximité et le français comme avantages", "Contrôlé"),
    ("Protection des données", "Conformité Loi 25 par conception ; données du client chez le client ; séparation stricte des mondes (nos clés, nos données — jamais mélangées)", "Éliminé"),
    ("Dépendance au fondateur", "Documentation vivante (le standard EL FUEGO) : chaque leçon est enregistrée, chaque processus expliqué — le savoir s'hérite", "Atténué"),
], header=("Risque", "Mitigation", "Statut"))

# ── 8. DEMANDE ──────────────────────────────────────────────
section(doc, "8", "La demande — partenaires et appui", "La direction + SADC")
bullet(doc, "SADC Charlevoix : ", "accompagnement-conseil ; mise en relation avec une PME pilote (idéalement dans Charlevoix-Est) ; aide au développement du réseau après validation ; aide aux demandes de subventions et de financement.")
bullet(doc, "Les canaux : ", "SDLE de la MRC de Charlevoix · Mission développement Charlevoix · Chambre de commerce de Charlevoix · Tourisme Charlevoix · Table agroalimentaire de Charlevoix.")
bullet(doc, "Après le pilote : ", "conseil consultatif de 3 à 5 personnes (propriétaire de PME, comptable, expert IA, représentant autochtone, ex-SADC).")

# ── 9. ORGANISME ─────────────────────────────────────────────
section(doc, "9", "L'organisme technologique", "Délégable : directeur technique — l'entrepreneur n'a pas besoin de lire ceci")
table3(doc, [
    ("Le Veilleux", "Dashboard, caisse virtuelle + contre-registre (Z-rapport), journée d'ouverture/fermeture, alertes « la IA informe, l'humain décide », centre de notifications, pont Facebook/Messenger", "Produit"),
    ("Les 7 organes", "workflow-master, decision-router, accountability-auditor, autonomy-grader, audit (qui enseigne), forensics (qui explique) + le cerveau double (rapide + raisonneur)", "Moteur DSH"),
    ("EL FUEGO", "Le standard de transfert de savoir humain-IA : 26 leçons réelles, format canonique — la mémoire de l'entreprise", "Mémoire"),
    ("Les gardes", "Tests automatiques du flux complet (smoke, contrats d'amorçage, garde CSS, parcours API, synchronisation du bundle)", "Qualité"),
], header=("Actif", "Ce que c'est", "Rôle"))

# ── 10. SOURCES ──────────────────────────────────────────────
section(doc, "10", "Sources et références (liens vérifiables)", "Délégable : analystes")
para(doc, "Les indicateurs de ce plan proviennent des sources publiques suivantes. Aucune source interne n'est citée comme preuve : chaque affirmation se rattache à un organisme vérifiable.", size=8.5, color=GRAY, italic=True, space_after=4)
cite(doc, "Statistique Canada — Enquête sur l'utilisation de l'IA par les entreprises", "https://www150.statcan.gc.ca/n1/fr/type/donnees?MM=1")
cite(doc, "Institut de la statistique du Québec — Adoption de l'IA au Québec", "https://statistique.quebec.ca/fr")
cite(doc, "BDC — Recherches et analyses (dont l'étude sur les 27 %)", "https://www.bdc.ca/fr/a-propos/recherche-analyses")
cite(doc, "Union des municipalités du Québec — Étude RCGT sur le fardeau administratif (2025)", "https://umq.qc.ca/")
cite(doc, "MRC de Charlevoix — Mission et portrait", "https://www.mrccharlevoix.ca/")
cite(doc, "MRC de Charlevoix-Est — Portrait et services", "https://www.mrccharlevoixest.ca/")
cite(doc, "Tourisme Charlevoix — Site officiel et bilans", "https://www.tourisme-charlevoix.com/")
cite(doc, "SADC Charlevoix – Côte-de-Beaupré – Île d'Orléans", "https://www.sadc-cae.ca/")
cite(doc, "Chambre de commerce de Charlevoix", "https://www.creezdesliens.com/")
cite(doc, "Investissement Québec — ESSOR", "https://www.investquebec.com/quebec/fr/produits-et-services/programmes-financiers")
cite(doc, "CNRC — PARI (aide à la recherche industrielle)", "https://nrc.canada.ca/fr/soutien-linnovation-technologique/programme-daide-recherche-industrielle")
cite(doc, "BDC — Programme LIFT", "https://www.bdc.ca/fr/financement/programmes-speciaux/lift")
cite(doc, "Revenu Québec — CRIC et CDAE", "https://www.revenuquebec.ca/fr/entreprises/credits/")
cite(doc, "Futurpreneur Canada", "https://www.futurpreneur.ca/fr/")
cite(doc, "Programme canadien d'adoption du numérique (PCAN)", "https://ised-isde.canada.ca/site/programme-canadien-adoption-numerique/fr")
cite(doc, "Microcrédit Charlevoix", "https://www.microcreditcharlevoix.ca/")
cite(doc, "Gouvernement du Québec — Loi 25", "https://www.quebec.ca/gouvernement/travailler-gouvernement/emplois-secteur-public/protection-renseignements-personnels")
cite(doc, "Légis Québec — Loi sur les contrats des organismes municipaux (C-65.01)", "https://www.legisquebec.gouv.qc.ca/")
cite(doc, "Registraire des entreprises du Québec (incorporation Franco Vision inc.)", "https://www.registreentreprises.gouv.qc.ca/")
cite(doc, "Commission d'accès à l'information du Québec — Loi 25", "https://www.cai.gouv.qc.ca/")
cite(doc, "FCEI — Adoption de l'IA et formation de la main-d'œuvre", "https://www.cfib-fcei.ca/fr")
cite(doc, "Le Charlevoisien — Actualités régionales", "https://www.lecharlevoisien.com/")
cite(doc, "Conseil de la Première Nation des Innus Essipit", "https://www.essipit.com/")

rule(doc, color="E5E7EB", sz=4, space_after=4)
para(doc, "Franco Vision inc. · Charlevoix, Québec · Plan d'affaires v3.0 · Novembre 2026", size=7.5, color=FAINT, align=WD_ALIGN_PARAGRAPH.CENTER)

out = sys.argv[1] if len(sys.argv) > 1 else "FRANCO-VISION-PLAN-AFFAIRES.docx"
doc.save(out)
print("saved", out)
