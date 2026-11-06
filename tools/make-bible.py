# Trasunto — PLAN D'AFFAIRES v3 (Nikan discipline: facts with verifiable links, no over-promising).
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.opc.constants import RELATIONSHIP_TYPE

import sys as _sys
_sys.path.insert(0, "tools")
from docfx import *

doc = Document()
cp = doc.core_properties
cp.title = "TRASUNTO — Plan d'affaires"
cp.author = "Javier Alejandro FRANCO LEAL"
cp.subject = "Plan d'affaires Trasunto"
cp.company = "Trasunto inc."
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
para(doc, "TRASUNTO — Plan d'affaires", size=21, bold=True, space_after=4)
para(doc, "L'IA travaille. L'humain veille, décide, révise.", size=13, bold=True, color=V, space_after=4)
para(doc, "Trasunto est le maillon humain entre l'intelligence artificielle et les entreprises de Charlevoix — celles qui n'ont ni le temps ni les ressources techniques pour l'implanter elles-mêmes.", size=10, color=MUTED, space_after=10)
para(doc, "L'intelligence artificielle demeure un outil — extraordinairement puissant — au service de l'humain : jamais un substitut au jugement, à la responsabilité ni à l'imputabilité humaine. Cette garantie n'est pas un luxe philosophique — c'est la condition qui rend l'IA admissible, dans l'entreprise comme dans l'administration.", size=10, color=MUTED, space_after=10)

# ── Sommaire ─────────────────────────────────────────────────
section(doc, "SOMMAIRE", "Sommaire et guide de lecture", "Tout le monde — 2 minutes")
table3(doc, [
    ("1", "Pourquoi maintenant — le constat et le rôle du maillon humain", "L'entrepreneur"),
    ("2", "Le marché — les indicateurs, pas des promesses", "L'entrepreneur + conseiller"),
    ("3", "L'offre — les services et le produit", "La direction"),
    ("4", "Le modèle d'affaires et la viabilité", "L'entrepreneur + comptable"),
    ("5", "L'aide financière disponible (clients et entreprise)", "Délégable : comptable"),
    ("6", "La feuille de route — le pilote d'abord", "La direction"),
    ("7", "L'échelle — des entreprises au gouvernement", "La direction"),
    ("8", "Les risques et leur mitigation", "La direction + conseil"),
    ("9", "La demande — partenaires et appui", "La direction + SADC"),
    ("10", "L'organisme technologique", "Délégable : directeur technique"),
    ("11", "Sources et références (liens vérifiables)", "Délégable : analystes"),
], header=("No", "Section", "À lire par"))

# ── 1. POURQUOI MAINTENANT ───────────────────────────────────
section(doc, "1", "Pourquoi maintenant — le constat et le rôle du maillon humain", "L'entrepreneur d'abord")
para(doc, "L'intelligence artificielle a changé de nature. La première génération — les robots conversationnels — répondait aux questions. La génération actuelle — les agents — exécute des tâches complètes : rédiger, classer, concilier, alerter. Ce basculement est la quatrième révolution industrielle.")
para(doc, "Concrètement, cela signifie que toute action réalisée par ordinateur — numérique, sans déplacer un seul atome — peut être automatisée. Les possibilités sont infinies ; nous ne faisons qu'effleurer la surface des capacités de l'IA. C'est l'ampleur même de ce potentiel qui rend le maillon humain indispensable : quelqu'un doit rendre cette puissance simple, locale et digne de confiance.")
para(doc, "L'histoire offre un précédent rassurant : la troisième révolution (l'informatique) n'a pas transformé les PME le jour où les ordinateurs ont été inventés, mais le jour où ils sont devenus assez simples pour qu'un propriétaire d'entreprise les utilise sans ingénieur — comme on utilise aujourd'hui un système d'exploitation. La même transition se répète avec l'IA : il manque le maillon humain qui rend la technologie simple, locale et digne de confiance. Ce maillon, c'est Trasunto.")
bullet(doc, "Le constat : ", "beaucoup d'entreprises savent que l'IA existe, peu savent quoi en faire — et une part surprenante l'utilise déjà sans le savoir.")
bullet(doc, "Maîtres chez nous : ", "nos clients deviennent autonomes et propriétaires de leurs outils — personne ne connaît mieux une entreprise que celui qui la dirige et la vit. L'IA potentialise les qualités, les techniques et les connaissances de la personne qui l'utilise ; elle ne la remplace jamais.")
bullet(doc, "La prudence assumée : ", "l'arrivée d'une technologie suscite toujours une surestimation et des attentes élevées ; les entreprises technologiques promettent souvent plus qu'elles ne peuvent livrer. Notre protection contre ce piège : l'antifragilité comme discipline — surpromettre et sous-livrer fait perdre la confiance des partenaires institutionnels et financiers, et nous ne le ferons pas.")
bullet(doc, "La méthode : ", "un pilote de 6 mois à tarif opérationnel, par secteur économique — un restaurant n'est pas un hôtel, ni une usine, ni une ferme : chaque nouveau secteur exige ses six mois d'implantation à prix opérationnel, et ce pilote est le socle de toute projection. Aucune promesse non validée sur le terrain.")
para(doc, "C'est précisément de cette idée — tirer profit du chaos — que l'antifragilité est notre façon de penser et d'agir : nous n'évoluons pas seulement dans un monde instable, mais l'arrivée de l'IA entraînera des changements imprévisibles dans de multiples aspects de la vie quotidienne. C'est dans ce contexte d'incertitude imposée et technique que notre approche montre toute sa valeur.")

# ── 2. MARCHÉ ────────────────────────────────────────────────
section(doc, "2", "Le marché — les indicateurs, pas des promesses", "L'entrepreneur + le conseiller")
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
bullet(doc, "Les travailleurs autonomes : ", "14 % des actifs de Charlevoix travaillent à leur compte — comptables, juristes, notaires, thérapeutes, créateurs. Le travailleur autonome est la pyramide entière en une seule personne : il travaille sur le terrain, il dirige et il est propriétaire. Il vit au quotidien les avantages et les risques de l\u2019IA agéntique, et sa charge administrative gruge de 30 à 40 % de ses heures. Notre offre lui rend les trois niveaux de l\u2019entreprise en un seul abonnement, avec la garantie que la responsabilité demeure humaine.")
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
    ("Le produit", "Fanal : l'assistant de travail installé chez le client — caisse, contre-registre (Z-rapport), journée d'ouverture/fermeture, alertes et centre de notifications « la IA informe, l'humain décide »", "SaaS"),
    ("Ligne 1", "Le Publicateur — publications Facebook/Instagram/X : Fanal rédige le brouillon en français, le client publie", "Inclus"),
    ("Ligne 2", "Le Répondant — Messenger/Gmail/Airbnb : Fanal lit la conversation, propose la réponse dans la langue du client (10 langues), le client envoie", "Inclus"),
    ("Ligne 3", "Le Secrétaire — formulaires, factures, comptabilité : Fanal remplit l'évident, laisse vide le délicat, le client signe", "Inclus"),
    ("Travailleurs autonomes", "Niveau 1 dédié : activation 1 500 $ + 199–349 $/mois — l'IA prépare, le professionnel signe ; compatible avec les ordres professionnels", "Micro-entreprises"),
], header=("Offre", "Ce que c'est", "Tarif"))

para(doc, "Fanal est neutre par conception : une maison Apple, deux prises interchangeables — Google ou Microsoft 365 — et un seul cerveau (la clé du client). Copilot ne parle que Microsoft, Gemini ne parle que Google ; Fanal parle avec les deux, dans l'écosystème que le client possède déjà. Trasunto n'emprisonne personne : le client change de clé ou de fournisseur quand il veut.", size=9.5, color=MUTED, space_after=8)

# ── 4. MODÈLE + VIABILITÉ ───────────────────────────────────
section(doc, "4", "Le modèle d'affaires et la viabilité", "L'entrepreneur + le comptable")
bullet(doc, "La viabilité : ", "86 000 – 96 000 $/an : charges annuelles ≈ 36 350 $ + salaire du fondateur de 50 000 à 60 000 $. Atteinte avec un nombre raisonnable de contrats — trois scénarios simples dans le plan du fondateur, à valider rigoureusement par le pilote.")
bullet(doc, "La servitisation 5.0 : ", "à maturité, la majorité des revenus provient de l'accompagnement mensuel récurrent — le forfait devient l'actif.")
bullet(doc, "Le pilote antifragile : ", "6 mois par secteur économique, à tarif opérationnel (couvre uniquement les frais) ; mécanisme « test – rétroaction – ajustement » ; à la fin : reconduction au tarif commercial ou sortie sans frais cachés.")
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
    ("Phase 0", "Valider la demande d'abord : premières conversations avec les entreprises bêta et lettres d'intérêt ; compléter le développement de l'application. Le nœud H1 ne démarre qu'une fois l'intérêt confirmé — un produit sans acheteur ne vaut rien", "Demande d'abord"),
    ("Trimestre 1", "Structuration interne : incorporation (Trasunto inc.), comptabilité, assurances ; dépôt du plan à la SADC ; signature de l'entente de phase pilote avec une PME locale", "Préparation"),
    ("Trimestres 2-3", "Phase pilote de 6 mois sur le premier secteur économique : diagnostic complet, implantations ciblées, mesure systématique (heures économisées, productivité, satisfaction), cas d'étude chiffré validé par le dirigeant", "Données réelles"),
    ("Trimestre 4", "Premier client commercial au tarif de la grille ; lancement public ; demande d'appui conditionnelle aux résultats du pilote", "Validation"),
    ("Au-delà", "Accords intermunicipaux et secteur public — seulement après validation sur le terrain, avec la même discipline de pilote", "Échelle"),
], header=("Période", "Les actions", "Le résultat"))

# ── 7. L'ÉCHELLE ────────────────────────────────────────────
section(doc, "7", "L'échelle — des entreprises au gouvernement", "La direction")
para(doc, "Les possibilités de l'IA agéntique dépassent largement le cadre des entreprises : le potentiel d'implantation s'étend au secteur gouvernemental et municipal, où la même friction — des processus de l'ère du papier — coûte 328,4 M$ par an aux municipalités québécoises. La même thèse, le même maillon humain, deux marchés : accompagner les PME aujourd'hui, accompagner les administrations demain, toujours avec la même discipline — un pilote par secteur, aucune promesse non validée.")
para(doc, "Le cadre légal accompagne cette échelle : la Loi sur les contrats des organismes municipaux (2026) permet une entrée progressive par adjudication directe, et les programmes régionaux (FRR, Volets 2-3 des MRC) financent la coopération intermunicipale. L'échelle se fera secteur par secteur, organisme par organisme — jamais par promesse.", size=9.5, color=MUTED)

# ── 8. RISQUES ───────────────────────────────────────────────
section(doc, "8", "Les risques et leur mitigation", "La direction + le conseil consultatif")
table3(doc, [
    ("Surestimation / sous-livraison", "La discipline antifragile : le pilote valide chaque promesse avant tout engagement public", "Structurel"),
    ("Adoption lente", "Résultats rapides sur les données existantes du client + formation pratique (MFOR)", "Contrôlé"),
    ("Concurrence", "Positionnement local et humain : le maillon entre l'IA et le propriétaire — la proximité et le français comme avantages", "Contrôlé"),
    ("Protection des données", "Conformité Loi 25 par conception ; données du client chez le client ; séparation stricte des mondes (nos clés, nos données — jamais mélangées)", "Éliminé"),
    ("Dépendance au fondateur", "Documentation vivante (le standard Knowledge Ledger) : chaque leçon est enregistrée, chaque processus expliqué — le savoir s'hérite", "Atténué"),
], header=("Risque", "Mitigation", "Statut"))

# ── 8. DEMANDE ──────────────────────────────────────────────
section(doc, "9", "La demande — partenaires et appui", "La direction + SADC")
bullet(doc, "SADC Charlevoix : ", "accompagnement-conseil ; mise en relation avec une PME pilote (idéalement dans Charlevoix-Est) ; aide au développement du réseau après validation ; aide aux demandes de subventions et de financement.")
bullet(doc, "Les canaux : ", "SDLE de la MRC de Charlevoix · Mission développement Charlevoix · Chambre de commerce de Charlevoix · Tourisme Charlevoix · Table agroalimentaire de Charlevoix.")
bullet(doc, "Après le pilote : ", "conseil consultatif de 3 à 5 personnes (propriétaire de PME, comptable, expert IA, ex-SADC).")

# ── 9. ORGANISME ─────────────────────────────────────────────
section(doc, "10", "L'organisme technologique — déjà réel, pas une idée", "Délégable : directeur technique — l'entrepreneur n'a pas besoin de lire ceci")
para(doc, "Cet organisme n'est pas un projet sur papier : il existe déjà, en version bêta, sur plusieurs plateformes. Il a été construit par l'intelligence artificielle agéntique et son fondateur — l'IA a écrit le code, l'humain a décidé, vérifié et signé chaque étape. Les registres publics en font foi.")
para(doc, "Souveraineté totale par conception : la clé d'API appartient au client et reste écrite sur sa propre machine ; ses données et sa télémétrie demeurent dans son silo. Trasunto ne détient ni ne traite aucun renseignement personnel — il installe, met au point, met à jour et accompagne. Le client peut changer de clé ou de fournisseur à tout moment, sans dépendre de Trasunto pour continuer.", size=9.5, color=MUTED)
table3(doc, [
    ("Registres publics", "GitHub : github.com/JavierFrancoLeal/jfranco-agentic-suite — 150+ commits documentés · npm : @javierfrancoleal — les 7 organes et le superviseur publiés et installables", "Preuve tangible"),
    ("Fanal (bêta)", "Application de bureau (macOS, DMG), navigateur, PWA installable (Android/iOS), wallboard — la même application sur cinq plateformes ; caisse, journée, alertes, centre de notifications, pont Facebook", "Produit"),
    ("Les 7 organes", "workflow-master, decision-router, accountability-auditor, autonomy-grader, audit (qui enseigne), forensics (qui explique) + le cerveau double (rapide + raisonneur)", "Moteur DSH"),
    ("Knowledge Ledger", "Le standard de transfert de savoir humain-IA : 26 leçons réelles, format canonique — la mémoire de l'entreprise", "Mémoire"),
    ("Les gardes", "Tests automatiques du flux complet (smoke, contrats d'amorçage, garde CSS, parcours API, synchronisation du bundle)", "Qualité"),
], header=("Actif", "Ce que c'est", "Rôle"))
cite(doc, "GitHub — JavierFrancoLeal/jfranco-agentic-suite", "https://github.com/JavierFrancoLeal/jfranco-agentic-suite")
cite(doc, "npm — @javierfrancoleal", "https://www.npmjs.com/search?q=%40javierfrancoleal")

# ── 11. SOURCES ──────────────────────────────────────────────
section(doc, "11", "Sources et références (liens vérifiables)", "Délégable : analystes")
cite(doc, "Nassim Nicholas Taleb — Antifragile : les bienfaits du désordre (2012)", "https://www.penguinrandomhouse.com/books/176227/antifragile-by-nassim-nicholas-taleb/")
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
cite(doc, "Registraire des entreprises du Québec (incorporation Trasunto inc.)", "https://www.registreentreprises.gouv.qc.ca/")
cite(doc, "Commission d'accès à l'information du Québec — Loi 25", "https://www.cai.gouv.qc.ca/")
cite(doc, "FCEI — Adoption de l'IA et formation de la main-d'œuvre", "https://www.cfib-fcei.ca/fr")
cite(doc, "Le Charlevoisien — Actualités régionales", "https://www.lecharlevoisien.com/")
cite(doc, "Conseil de la Première Nation des Innus Essipit", "https://www.essipit.com/")

footer(doc, "Trasunto inc. · Charlevoix, Québec", "Plan d'affaires v3.0 · Novembre 2026")

out = sys.argv[1] if len(sys.argv) > 1 else "TRASUNTO-PLAN-AFFAIRES.docx"
doc.save(out)
print("saved", out)
