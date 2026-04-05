// Sftw1_AsterismCatalog.js
// Catálogo de asterismos ADAPTADO ao banco atual do site.
// ETAPA 6:
// - mantém a API existente
// - amplia o catálogo com asterismos clássicos de observação
// - reforça aliases para aumentar a taxa de resolução no banco atual
// - preserva o contrato usado por Visualization / Loader / jogo futuro

class Sftw1_AsterismCatalog {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.catalog = [];
        this.resolved = false;
        console.log("✨ Sftw1_AsterismCatalog inicializado");
    }

    getRawAsterisms() {
        return [
            {
                id: "big_dipper",
                name: "Big Dipper",
                namePt: "Grande Carro",
                culture: "western",
                aliases: ["Ursa Major Asterism", "The Plough", "Arado", "Carro Grande"],
                stars: [
                    { id: "dubhe",  name: "Dubhe",  con: "Uma", aliases: ["Alpha Ursae Majoris"] },
                    { id: "merak",  name: "Merak",  con: "Uma", aliases: ["Beta Ursae Majoris"] },
                    { id: "phad",   name: "Phad",   con: "Uma", aliases: ["Phecda", "Gamma Ursae Majoris"] },
                    { id: "megrez", name: "Megrez", con: "Uma", aliases: ["Delta Ursae Majoris"] },
                    { id: "alioth", name: "Alioth", con: "Uma", aliases: ["Epsilon Ursae Majoris"] },
                    { id: "mizar",  name: "Mizar",  con: "Uma", aliases: ["Zeta Ursae Majoris"] },
                    { id: "alkaid", name: "Alkaid", con: "Uma", aliases: ["Eta Ursae Majoris", "Benetnash"] }
                ],
                segments: [
                    ["dubhe", "merak"],
                    ["merak", "phad"],
                    ["phad", "megrez"],
                    ["megrez", "alioth"],
                    ["alioth", "mizar"],
                    ["mizar", "alkaid"]
                ]
            },
            {
                id: "little_dipper",
                name: "Little Dipper",
                namePt: "Pequeno Carro",
                culture: "western",
                aliases: ["Little Bear", "Ursa Minor Asterism", "Carro Menor"],
                stars: [
                    { id: "polaris", name: "Polaris", con: "Umi", aliases: ["Alpha Ursae Minoris", "North Star"] },
                    { id: "kochab", name: "Kochab", con: "Umi", aliases: ["Beta Ursae Minoris"] },
                    { id: "pherkad", name: "Pherkad", con: "Umi", aliases: ["Gamma Ursae Minoris"] },
                    { id: "yildun", name: "Yildun", con: "Umi", aliases: ["Delta Ursae Minoris"] }
                ],
                segments: [
                    ["polaris", "yildun"],
                    ["yildun", "pherkad"],
                    ["pherkad", "kochab"],
                    ["kochab", "polaris"]
                ]
            },
            {
                id: "southern_cross",
                name: "Southern Cross",
                namePt: "Cruzeiro do Sul",
                culture: "western",
                aliases: ["Crux", "Cross of the South"],
                stars: [
                    { id: "gacrux",  name: "Gacrux",  con: "Cru", aliases: ["Gamma Crucis"] },
                    { id: "acrux",   name: "Acrux",   con: "Cru", aliases: ["Alpha Crucis"] },
                    { id: "becrux",  name: "Becrux",  con: "Cru", aliases: ["Beta Crucis", "Mimosa"] },
                    { id: "delta",   name: "Del Cru", con: "Cru", aliases: ["Delta Crucis"] },
                    { id: "epsilon", name: "Eps Cru", con: "Cru", aliases: ["Epsilon Crucis"] }
                ],
                segments: [
                    ["gacrux", "acrux"],
                    ["becrux", "delta"],
                    ["becrux", "acrux"],
                    ["delta", "acrux"]
                ]
            },
            {
                id: "false_cross",
                name: "False Cross",
                namePt: "Falso Cruzeiro",
                culture: "western",
                aliases: ["False Southern Cross"],
                stars: [
                    { id: "avior", name: "Avior", con: "Car", aliases: ["Epsilon Carinae"] },
                    { id: "aspidiske", name: "Aspidiske", con: "Car", aliases: ["Iota Carinae"] },
                    { id: "delta_vel", name: "Delta Velorum", con: "Vel", aliases: ["Delta Vel", "Alsephina"] },
                    { id: "kappa_vel", name: "Kappa Velorum", con: "Vel", aliases: ["Kappa Vel"] }
                ],
                segments: [
                    ["avior", "aspidiske"],
                    ["aspidiske", "delta_vel"],
                    ["delta_vel", "kappa_vel"],
                    ["kappa_vel", "avior"]
                ]
            },
            {
                id: "diamond_cross",
                name: "Diamond Cross",
                namePt: "Cruzeiro Diamante",
                culture: "western",
                aliases: ["Diamond of Carina-Vela"],
                stars: [
                    { id: "avior", name: "Avior", con: "Car", aliases: ["Epsilon Carinae"] },
                    { id: "miaplacidus", name: "Miaplacidus", con: "Car", aliases: ["Beta Carinae"] },
                    { id: "aspidiske", name: "Aspidiske", con: "Car", aliases: ["Iota Carinae"] },
                    { id: "delta_vel", name: "Delta Velorum", con: "Vel", aliases: ["Delta Vel", "Alsephina"] }
                ],
                segments: [
                    ["avior", "miaplacidus"],
                    ["miaplacidus", "delta_vel"],
                    ["delta_vel", "aspidiske"],
                    ["aspidiske", "avior"]
                ]
            },
            {
                id: "great_diamond",
                name: "Great Diamond",
                namePt: "Grande Diamante",
                culture: "western",
                aliases: ["Diamond of Virgo"],
                stars: [
                    { id: "arcturus",   name: "Arcturus",   con: "Boo", aliases: ["Alpha Boötis"] },
                    { id: "spica",      name: "Spica",      con: "Vir", aliases: ["Alpha Virginis"] },
                    { id: "denebola",   name: "Denebola",   con: "Leo", aliases: ["Beta Leonis"] },
                    { id: "cor_caroli", name: "Cor Caroli", con: "Cvn", aliases: ["Alpha Canum Venaticorum"] }
                ],
                segments: [
                    ["arcturus", "spica"],
                    ["spica", "denebola"],
                    ["denebola", "cor_caroli"],
                    ["cor_caroli", "arcturus"]
                ]
            },
            {
                id: "spring_triangle",
                name: "Spring Triangle",
                namePt: "Triângulo da Primavera",
                culture: "western",
                aliases: ["Triangulo da Primavera"],
                stars: [
                    { id: "arcturus", name: "Arcturus", con: "Boo", aliases: ["Alpha Boötis"] },
                    { id: "spica", name: "Spica", con: "Vir", aliases: ["Alpha Virginis"] },
                    { id: "regulus", name: "Regulus", con: "Leo", aliases: ["Alpha Leonis"] }
                ],
                segments: [
                    ["arcturus", "spica"],
                    ["spica", "regulus"],
                    ["regulus", "arcturus"]
                ]
            },
            {
                id: "summer_triangle",
                name: "Summer Triangle",
                namePt: "Triângulo de Verão",
                culture: "western",
                aliases: ["Triangulo de Verao"],
                stars: [
                    { id: "vega",   name: "Vega",   con: "Lyr", aliases: ["Alpha Lyrae"] },
                    { id: "deneb",  name: "Deneb",  con: "Cyg", aliases: ["Alpha Cygni"] },
                    { id: "altair", name: "Altair", con: "Aql", aliases: ["Alpha Aquilae"] }
                ],
                segments: [
                    ["vega", "deneb"],
                    ["deneb", "altair"],
                    ["altair", "vega"]
                ]
            },
            {
                id: "northern_cross",
                name: "Northern Cross",
                namePt: "Cruz do Norte",
                culture: "western",
                aliases: ["Cross of Cygnus", "Cisne em Cruz"],
                stars: [
                    { id: "deneb", name: "Deneb", con: "Cyg", aliases: ["Alpha Cygni"] },
                    { id: "sadr", name: "Sadr", con: "Cyg", aliases: ["Gamma Cygni"] },
                    { id: "albireo", name: "Albireo", con: "Cyg", aliases: ["Beta Cygni"] },
                    { id: "gienah_cyg", name: "Gienah", con: "Cyg", aliases: ["Gienah Cygni", "Epsilon Cygni"] },
                    { id: "rukh", name: "Rukh", con: "Cyg", aliases: ["Delta Cygni"] }
                ],
                segments: [
                    ["deneb", "sadr"],
                    ["sadr", "albireo"],
                    ["gienah_cyg", "sadr"],
                    ["sadr", "rukh"]
                ]
            },
            {
                id: "winter_triangle",
                name: "Winter Triangle",
                namePt: "Triângulo de Inverno",
                culture: "western",
                aliases: ["Triangulo de Inverno"],
                stars: [
                    { id: "betelgeuse", name: "Betelgeuse", con: "Ori", aliases: ["Alpha Orionis"] },
                    { id: "sirius",     name: "Sirius",     con: "Cma", aliases: ["Alpha Canis Majoris"] },
                    { id: "procyon",    name: "Procyon",    con: "Cmi", aliases: ["Alpha Canis Minoris"] }
                ],
                segments: [
                    ["betelgeuse", "sirius"],
                    ["sirius", "procyon"],
                    ["procyon", "betelgeuse"]
                ]
            },
            {
                id: "great_square",
                name: "Great Square of Pegasus",
                namePt: "Grande Quadrado de Pégaso",
                culture: "western",
                aliases: ["Great Square", "Quadrado de Pegaso", "Grande Quadrado"],
                stars: [
                    { id: "markab",     name: "Markab",     con: "Peg", aliases: ["Alpha Pegasi"] },
                    { id: "scheat",     name: "Scheat",     con: "Peg", aliases: ["Beta Pegasi"] },
                    { id: "algenib",    name: "Algenib",    con: "Peg", aliases: ["Gamma Pegasi"] },
                    { id: "alpheratz",  name: "Alpheratz",  con: "And", aliases: ["Alpha Andromedae", "Sirrah"] }
                ],
                segments: [
                    ["markab", "scheat"],
                    ["scheat", "alpheratz"],
                    ["alpheratz", "algenib"],
                    ["algenib", "markab"]
                ]
            },
            {
                id: "circlet_of_pisces",
                name: "Circlet of Pisces",
                namePt: "Círculo de Peixes",
                culture: "western",
                aliases: ["Circlet", "Circlet of the Western Fish", "Circulo de Peixes"],
                stars: [
                    { id: "alpherg", name: "Alpherg", con: "Psc", aliases: ["Eta Piscium"] },
                    { id: "torcular", name: "Torcular", con: "Psc", aliases: ["Omicron Piscium"] },
                    { id: "iota_psc", name: "Iota Piscium", con: "Psc", aliases: ["Iota Psc"] },
                    { id: "lambda_psc", name: "Lambda Piscium", con: "Psc", aliases: ["Lambda Psc"] }
                ],
                segments: [
                    ["alpherg", "torcular"],
                    ["torcular", "iota_psc"],
                    ["iota_psc", "lambda_psc"],
                    ["lambda_psc", "alpherg"]
                ]
            },
            {
                id: "orions_belt",
                name: "Orion's Belt",
                namePt: "Cinturão de Órion",
                culture: "western",
                aliases: ["Tres Marias", "Three Kings", "The Belt"],
                stars: [
                    { id: "alnitak", name: "Alnitak", con: "Ori", aliases: ["Zeta Orionis"] },
                    { id: "alnilam", name: "Alnilam", con: "Ori", aliases: ["Epsilon Orionis"] },
                    { id: "mintaka", name: "Mintaka", con: "Ori", aliases: ["Delta Orionis"] }
                ],
                segments: [
                    ["alnitak", "alnilam"],
                    ["alnilam", "mintaka"]
                ]
            },
            {
                id: "winter_hexagon",
                name: "Winter Hexagon",
                namePt: "Hexágono de Inverno",
                culture: "western",
                aliases: ["Hexagono de Inverno"],
                stars: [
                    { id: "capella",     name: "Capella",     con: "Aur", aliases: ["Alpha Aurigae"] },
                    { id: "aldebaran",   name: "Aldebaran",   con: "Tau", aliases: ["Alpha Tauri"] },
                    { id: "rigel",       name: "Rigel",       con: "Ori", aliases: ["Beta Orionis"] },
                    { id: "sirius",      name: "Sirius",      con: "Cma", aliases: ["Alpha Canis Majoris"] },
                    { id: "procyon",     name: "Procyon",     con: "Cmi", aliases: ["Alpha Canis Minoris"] },
                    { id: "pollux_capella_bridge", name: "Pollux", con: "Gem", aliases: ["Beta Geminorum"] },
                    { id: "castor_bridge", name: "Castor", con: "Gem", aliases: ["Alpha Geminorum"] }
                ],
                segments: [
                    ["capella", "aldebaran"],
                    ["aldebaran", "rigel"],
                    ["rigel", "sirius"],
                    ["sirius", "procyon"],
                    ["procyon", "castor_bridge"],
                    ["castor_bridge", "capella"]
                ]
            },
            {
                id: "sickle_of_leo",
                name: "Sickle of Leo",
                namePt: "Foice de Leão",
                culture: "western",
                aliases: ["Foice de Leao", "Backward Question Mark", "Question Mark of Leo"],
                stars: [
                    { id: "regulus", name: "Regulus", con: "Leo", aliases: ["Alpha Leonis"] },
                    { id: "rasalas", name: "Rasalas", con: "Leo", aliases: ["Mu Leonis"] },
                    { id: "adhafera", name: "Adhafera", con: "Leo", aliases: ["Zeta Leonis"] },
                    { id: "algieba", name: "Algieba", con: "Leo", aliases: ["Gamma Leonis"] },
                    { id: "aljabhah", name: "Al Jabhah", con: "Leo", aliases: ["Algieba Minor", "Eta Leonis"] }
                ],
                segments: [
                    ["regulus", "rasalas"],
                    ["rasalas", "adhafera"],
                    ["adhafera", "algieba"],
                    ["algieba", "aljabhah"]
                ]
            },
            {
                id: "keystone_of_hercules",
                name: "Keystone of Hercules",
                namePt: "Pedra Angular de Hércules",
                culture: "western",
                aliases: ["Keystone", "Quadrilateral of Hercules"],
                stars: [
                    { id: "pi_her", name: "Pi Herculis", con: "Her", aliases: ["Pi Her"] },
                    { id: "eta_her", name: "Eta Herculis", con: "Her", aliases: ["Eta Her"] },
                    { id: "zeta_her", name: "Zeta Herculis", con: "Her", aliases: ["Zeta Her"] },
                    { id: "epsilon_her", name: "Epsilon Herculis", con: "Her", aliases: ["Epsilon Her"] }
                ],
                segments: [
                    ["pi_her", "eta_her"],
                    ["eta_her", "zeta_her"],
                    ["zeta_her", "epsilon_her"],
                    ["epsilon_her", "pi_her"]
                ]
            },
            {
                id: "head_of_draco",
                name: "Head of Draco",
                namePt: "Cabeça do Dragão",
                culture: "western",
                aliases: ["Head of the Dragon", "Cabeca do Dragao"],
                stars: [
                    { id: "eltanin", name: "Eltanin", con: "Dra", aliases: ["Gamma Draconis"] },
                    { id: "rastaban", name: "Rastaban", con: "Dra", aliases: ["Beta Draconis"] },
                    { id: "grumium", name: "Grumium", con: "Dra", aliases: ["Xi Draconis"] },
                    { id: "kuma", name: "Kuma", con: "Dra", aliases: ["Nu Draconis"] }
                ],
                segments: [
                    ["eltanin", "rastaban"],
                    ["rastaban", "grumium"],
                    ["grumium", "kuma"],
                    ["kuma", "eltanin"]
                ]
            },
            {
                id: "water_jar",
                name: "Water Jar",
                namePt: "Jarra d'Água",
                culture: "western",
                aliases: ["Water Jar of Aquarius", "Jarra de Agua"],
                stars: [
                    { id: "sadalmelik", name: "Sadalmelik", con: "Aqr", aliases: ["Alpha Aquarii"] },
                    { id: "sadalsuud", name: "Sadalsuud", con: "Aqr", aliases: ["Beta Aquarii"] },
                    { id: "skat", name: "Skat", con: "Aqr", aliases: ["Delta Aquarii"] },
                    { id: "albali", name: "Albali", con: "Aqr", aliases: ["Epsilon Aquarii"] }
                ],
                segments: [
                    ["sadalmelik", "sadalsuud"],
                    ["sadalsuud", "skat"],
                    ["skat", "albali"],
                    ["albali", "sadalmelik"]
                ]
            },
            {
                id: "teapot",
                name: "Teapot",
                namePt: "Bule",
                culture: "western",
                aliases: ["Sagittarius Teapot"],
                stars: [
                    { id: "kaus_borealis",     name: "Kaus Borealis",     con: "Sgr", aliases: ["Lambda Sagittarii"] },
                    { id: "nunki",             name: "Nunki",             con: "Sgr", aliases: ["Sigma Sagittarii"] },
                    { id: "kaus_meridionalis", name: "Kaus Meridionalis", con: "Sgr", aliases: ["Delta Sagittarii"] },
                    { id: "kaus_australis",    name: "Kaus Australis",    con: "Sgr", aliases: ["Epsilon Sagittarii"] },
                    { id: "nash",              name: "Nash",              con: "Sgr", aliases: ["Gamma Sagittarii", "Alnasl"] }
                ],
                segments: [
                    ["kaus_borealis", "nunki"],
                    ["nunki", "kaus_meridionalis"],
                    ["kaus_meridionalis", "kaus_australis"],
                    ["kaus_australis", "nash"],
                    ["nash", "kaus_borealis"]
                ]
            },
            {
                id: "fish_hook",
                name: "Fish Hook of Scorpius",
                namePt: "Anzol de Escorpião",
                culture: "western",
                aliases: ["Scorpion Hook", "Hook of Scorpius", "Anzol de Escorpiao"],
                stars: [
                    { id: "dschubba", name: "Dschubba", con: "Sco", aliases: ["Delta Scorpii"] },
                    { id: "antares", name: "Antares", con: "Sco", aliases: ["Alpha Scorpii"] },
                    { id: "sargas", name: "Sargas", con: "Sco", aliases: ["Theta Scorpii"] },
                    { id: "jabbah", name: "Jabbah", con: "Sco", aliases: ["Nu Scorpii"] },
                    { id: "shaula", name: "Shaula", con: "Sco", aliases: ["Lambda Scorpii"] },
                    { id: "lesath", name: "Lesath", con: "Sco", aliases: ["Upsilon Scorpii"] }
                ],
                segments: [
                    ["dschubba", "antares"],
                    ["antares", "sargas"],
                    ["sargas", "shaula"],
                    ["shaula", "lesath"],
                    ["dschubba", "jabbah"]
                ]
            },
            {
                id: "jobs_coffin",
                name: "Job's Coffin",
                namePt: "Caixão de Jó",
                culture: "western",
                aliases: ["Jobs Coffin", "Delphinus Diamond"],
                stars: [
                    { id: "rotanev", name: "Rotanev", con: "Del", aliases: ["Beta Delphini"] },
                    { id: "sualocin", name: "Sualocin", con: "Del", aliases: ["Alpha Delphini"] },
                    { id: "gamma_del", name: "Gamma Delphini", con: "Del", aliases: ["Gamma Del"] },
                    { id: "delta_del", name: "Delta Delphini", con: "Del", aliases: ["Delta Del"] }
                ],
                segments: [
                    ["rotanev", "sualocin"],
                    ["sualocin", "gamma_del"],
                    ["gamma_del", "delta_del"],
                    ["delta_del", "rotanev"]
                ]
            },
            {
                id: "the_pointers",
                name: "The Pointers",
                namePt: "As Apontadoras",
                culture: "western",
                aliases: ["Pointer Stars", "Guardians of the Pole"],
                stars: [
                    { id: "dubhe", name: "Dubhe", con: "Uma", aliases: ["Alpha Ursae Majoris"] },
                    { id: "merak", name: "Merak", con: "Uma", aliases: ["Beta Ursae Majoris"] }
                ],
                segments: [
                    ["dubhe", "merak"]
                ]
            }
        ];
    }

    initialize() {
        this.catalog = this.buildResolvedCatalog();
        this.resolved = true;
        console.log(`✅ Asterismos resolvidos: ${this.catalog.length}`);
        return this.catalog;
    }

    getAllAsterisms() {
        if (!this.resolved) this.initialize();
        return this.catalog.slice();
    }

    getAsterismById(id) {
        if (!this.resolved) this.initialize();
        return this.catalog.find(a => a.id === id) || null;
    }

    getPlayableAsterisms() {
        if (!this.resolved) this.initialize();
        return this.catalog.filter(a => a.isPlayable);
    }

    getAsterismSummary() {
        if (!this.resolved) this.initialize();
        const playable = this.catalog.filter(a => a.isPlayable);
        const broken = this.catalog.filter(a => !a.isPlayable);
        return {
            total: this.catalog.length,
            playable: playable.length,
            broken: broken.length,
            brokenIds: broken.map(a => a.id)
        };
    }

    buildResolvedCatalog() {
        const raw = this.getRawAsterisms();
        const starPool = this.getStarPool();
        return raw.map(item => this.resolveAsterism(item, starPool));
    }

    getStarPool() {
        if (Array.isArray(this.sftw?.stars) && this.sftw.stars.length) {
            return this.sftw.stars;
        }

        const all = window.SFTW_STAR_DATA || {};
        if (Array.isArray(all["hyg_20000"]) && all["hyg_20000"].length) {
            return all["hyg_20000"];
        }

        const firstKey = Object.keys(all)[0];
        if (firstKey && Array.isArray(all[firstKey])) {
            return all[firstKey];
        }

        return [];
    }

    resolveAsterism(rawAsterism, starPool) {
        const resolvedStars = [];
        const missingStars = [];

        for (const rawStar of rawAsterism.stars) {
            const resolved = this.findStarInPool(rawStar, starPool);
            if (resolved) {
                resolvedStars.push({
                    localId: rawStar.id,
                    refName: rawStar.name,
                    refCon: rawStar.con,
                    star: resolved,
                    key: this.makeResolvedStarKey(resolved)
                });
            } else {
                missingStars.push({
                    localId: rawStar.id,
                    refName: rawStar.name,
                    refCon: rawStar.con
                });
            }
        }

        const starMap = new Map(resolvedStars.map(s => [s.localId, s]));
        const resolvedSegments = [];
        const brokenSegments = [];

        for (const [a, b] of rawAsterism.segments) {
            const sa = starMap.get(a);
            const sb = starMap.get(b);

            if (sa && sb) {
                resolvedSegments.push({
                    aLocalId: a,
                    bLocalId: b,
                    aKey: sa.key,
                    bKey: sb.key,
                    canonical: this.makeCanonicalSegment(sa.key, sb.key)
                });
            } else {
                brokenSegments.push([a, b]);
            }
        }

        return {
            id: rawAsterism.id,
            name: rawAsterism.name,
            namePt: rawAsterism.namePt || rawAsterism.name,
            aliases: Array.isArray(rawAsterism.aliases) ? rawAsterism.aliases.slice() : [],
            culture: rawAsterism.culture || "unknown",
            stars: resolvedStars,
            segments: resolvedSegments,
            rawStarCount: rawAsterism.stars.length,
            resolvedStarCount: resolvedStars.length,
            rawSegmentCount: rawAsterism.segments.length,
            resolvedSegmentCount: resolvedSegments.length,
            missingStars,
            brokenSegments,
            isPlayable:
                missingStars.length === 0 &&
                brokenSegments.length === 0 &&
                resolvedSegments.length > 0
        };
    }

    _getCandidateNamesForStarPoolEntry(star) {
        const out = new Set();
        const push = (value) => {
            const norm = this.norm(value);
            if (norm) out.add(norm);
        };

        push(star?.name);
        push(star?.proper);
        push(star?.properName);
        push(star?.displayName);
        push(star?.designation);
        push(star?.bayer);
        push(star?.bf);
        push(star?.hr);

        if (Array.isArray(star?.aliases)) {
            for (const a of star.aliases) push(a);
        }

        return Array.from(out);
    }

    findStarInPool(rawStar, starPool) {
        const wantedCon = this.norm(rawStar.con);
        const candidates = starPool.filter(s => this.norm(s.con || s.constellation) === wantedCon);
        if (!candidates.length) return null;

        const namesToTry = [rawStar.name, ...(rawStar.aliases || [])]
            .map(n => this.norm(n))
            .filter(Boolean);

        for (const wantedName of namesToTry) {
            const exact = candidates.find(s => this._getCandidateNamesForStarPoolEntry(s).includes(wantedName));
            if (exact) return exact;
        }

        for (const wantedName of namesToTry) {
            const contains = candidates.find(s => {
                const candidateNames = this._getCandidateNamesForStarPoolEntry(s);
                return candidateNames.some(name => name.includes(wantedName) || wantedName.includes(name));
            });
            if (contains) return contains;
        }

        return null;
    }

    norm(value) {
        return String(value || "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    makeResolvedStarKey(star) {
        const con = star.con || star.constellation || "";
        const name = star.name || star.proper || star.properName || "star";
        const ra = Number(star.ra || 0).toFixed(6);
        const dec = Number(star.dec || 0).toFixed(6);
        return `${con}|${name}|${ra}|${dec}`;
    }

    makeCanonicalSegment(aKey, bKey) {
        return [aKey, bKey].sort().join("::");
    }

    buildUserSegmentSet(userSegments) {
        const set = new Set();
        for (const seg of userSegments || []) {
            if (!seg || !seg.aKey || !seg.bKey) continue;
            set.add(this.makeCanonicalSegment(seg.aKey, seg.bKey));
        }
        return set;
    }

    buildExpectedSegmentSet(asterismId) {
        const asterism = this.getAsterismById(asterismId);
        const set = new Set();
        if (!asterism || !asterism.isPlayable) return set;

        for (const seg of asterism.segments) {
            set.add(seg.canonical);
        }

        return set;
    }

    compareUserSegments(asterismId, userSegments) {
        const expected = this.buildExpectedSegmentSet(asterismId);
        const user = this.buildUserSegmentSet(userSegments);

        const correct = [];
        const missing = [];
        const extra = [];

        for (const seg of expected) {
            if (user.has(seg)) correct.push(seg);
            else missing.push(seg);
        }

        for (const seg of user) {
            if (!expected.has(seg)) extra.push(seg);
        }

        return {
            asterismId,
            expectedCount: expected.size,
            userCount: user.size,
            correct,
            missing,
            extra,
            isPerfect: missing.length === 0 && extra.length === 0 && expected.size > 0
        };
    }
}

if (typeof window !== "undefined") {
    window.Sftw1_AsterismCatalog = Sftw1_AsterismCatalog;

    if (typeof Sftw1 !== "undefined") {
        Sftw1.injectAsterismCatalogMethods = function (sftwInstance) {
            const catalog = new Sftw1_AsterismCatalog(sftwInstance);

            sftwInstance.asterismCatalog = catalog;

            sftwInstance.initializeAsterismCatalog = function () {
                return catalog.initialize();
            };

            sftwInstance.getAllAsterisms = function () {
                return catalog.getAllAsterisms();
            };

            sftwInstance.getPlayableAsterisms = function () {
                return catalog.getPlayableAsterisms();
            };

            sftwInstance.getAsterismById = function (id) {
                return catalog.getAsterismById(id);
            };

            sftwInstance.getAsterismSummary = function () {
                return catalog.getAsterismSummary();
            };

            sftwInstance.compareAsterismSegments = function (asterismId, userSegments) {
                return catalog.compareUserSegments(asterismId, userSegments);
            };

            console.log("✅ Sftw1_AsterismCatalog injetado");
        };
    }

    console.log("🚀 Sftw1_AsterismCatalog.js carregado");
}
