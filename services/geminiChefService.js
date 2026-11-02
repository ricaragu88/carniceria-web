/**
 * SERVICIO INTELIGENTE DE CHEF Y RECETAS (Chef Hispanidad)
 * 
 * Conecta con Google Gemini para generar recetas adaptadas al mostrador real
 * de la carnicería, recomendando el mejor método de cocción según los
 * electrodomésticos de los que dispone el vecino en su cocina.
 */

class GeminiChefService {
  /**
   * Genera una receta o menú semanal adaptado a los productos disponibles en la carnicería
   */
  static async generateRecipe({ mode, query, diners = 4, appliances = ['sarten'], healthy = true, availableProducts = [] }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const aiResult = await this.callGeminiAPI({ apiKey, mode, query, diners, appliances, healthy, availableProducts });
        if (aiResult) return aiResult;
      } catch (err) {
        console.warn('Fallo llamada Gemini, utilizando motor culinario de respaldo:', err.message);
      }
    }

    // Motor culinario de respaldo garantizado (100% offline y funcional)
    return this.generateFallbackRecipe({ mode, query, diners, appliances, healthy, availableProducts });
  }

  /**
   * Llamada a la API de Google Gemini (v1beta generateContent)
   */
  static async callGeminiAPI({ apiKey, mode, query, diners, appliances = ['sarten'], healthy, availableProducts }) {
    const productCatalogBrief = availableProducts.map(p => 
      `- ID ${p.id}: "${p.name}" (${p.price} €/${p.unit}) - Opciones: ${(p.options || []).join(', ')}`
    ).join('\n');

    const applianceLabels = {
      sarten: 'Sartén / Plancha',
      airfryer: 'Airfryer (Freidora de aire)',
      horno: 'Horno tradicional',
      olla_guiso: 'Olla / Guiso / Olla rápida'
    };

    const userAppliancesList = appliances.map(a => applianceLabels[a] || a).join(', ');

    const prompt = `
Eres el maestro carnicero y chef de "Carnicería Parque Hispanidad" en Zaragoza.
Tu misión es guiar al vecino con una receta deliciosa, saludable y fácil de preparar en casa,
seleccionando ÚNICAMENTE cortes de carne que realmente existen en nuestro catálogo actual.

CATÁLOGO REAL DE LA CARNICERÍA:
${productCatalogBrief}

DATOS DEL VECINO:
- Modalidad: ${mode} ("menu_semanal", "chef_gourmet", "nevera", "receta_libre")
- Petición / Ingredientes que tiene: "${query || 'Sugerencia del chef'}"
- Número de comensales: ${diners} personas
- ELECTRODOMÉSTICOS DE LOS QUE DISPONE EN SU COCINA: [${userAppliancesList}]
- Enfoque saludable: ${healthy ? 'Sí, equilibrado, rico en nutrientes y con técnicas digestivas' : 'Estándar'}

IMPORTANTE: El usuario dispone de varios electrodomésticos (${userAppliancesList}).
Como Chef experto, debes ELEGIR y RECOMENDAR cuál de ellos es el MEJOR para esta elaboración concreta, y explicarle por qué (ej: si tiene horno y airfryer, aconsejarle la airfryer para tardar 12 min y ahorrar luz; o si tiene sartén y olla, aconsejarle la sartén para vuelta y vuelta).

Debes responder EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura (sin formato Markdown ni texto extra):
{
  "recipe_title": "Nombre atractivo de la receta o menú",
  "subtitle": "Breve frase apetitosa",
  "diners": ${diners},
  "recommended_appliance": "sarten|airfryer|horno|olla_guiso (debe ser uno de los que tiene el usuario)",
  "recommended_appliance_label": "Nombre amigable (ej: Airfryer)",
  "prep_time_minutes": 35,
  "healthy_tip": "Consejo nutricional del carnicero para hacerla saludable y digestiva",
  "appliance_tip": "Por qué le recomiendas este electrodoméstico entre los que tiene y el truco de cocinado",
  "ingredients_to_buy": [
    {
      "product_id": 1,
      "product_name": "Nombre exacto del producto del catálogo",
      "quantity": 0.5,
      "unit": "kg",
      "preparation": "Una de las opciones exactas del producto (ej: filetes muy finos, troceado para guiso)",
      "reason": "Por qué este corte es el ideal para esta receta y este método de cocinado"
    }
  ],
  "pantry_ingredients": [
    "Ingrediente que ya suele tener en casa (ej: 2 dientes de ajo, aceite de oliva virgen extra, sal)"
  ],
  "steps": [
    {
      "number": 1,
      "title": "Preparación previa",
      "instruction": "Paso a paso claro y cercano en español de España...",
      "timer_minutes": 5
    }
  ]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error API Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText);
  }

  /**
   * Motor Culinario de respaldo con recetas maestras probadas
   */
  static generateFallbackRecipe({ mode, query = '', diners = 4, appliances = ['sarten'], healthy = true, availableProducts = [] }) {
    const q = query.toLowerCase();

    const hasAirfryer = appliances.includes('airfryer');
    const hasHorno = appliances.includes('horno');
    const hasOlla = appliances.includes('olla_guiso');
    const hasSarten = appliances.includes('sarten');

    // 1. Canelones o pasta rellena
    if (q.includes('canelon') || q.includes('lasa') || q.includes('pasta')) {
      const minQty = Math.round((diners * 0.15) * 100) / 100;
      const chosenAppliance = hasAirfryer ? 'airfryer' : (hasHorno ? 'horno' : 'sarten');
      
      return {
        recipe_title: "Canelones Caseros Tradicionales de Fiesta",
        subtitle: `Relleno meloso y suave para ${diners} comensales`,
        diners: diners,
        recommended_appliance: chosenAppliance,
        recommended_appliance_label: chosenAppliance === 'airfryer' ? '🍟 Airfryer' : (chosenAppliance === 'horno' ? '🥘 Horno' : '🍳 Sartén'),
        prep_time_minutes: 40,
        healthy_tip: "Añade calabacín o zanahoria muy picadita al sofrito: aporta humedad natural, fibra y reduce las calorías de la bechamel.",
        appliance_tip: chosenAppliance === 'airfryer' 
          ? "Como dispones de Airfryer, te recomiendo usarla: en un molde a 180°C gratinarás en solo 10 minutos ahorrando un 70% de luz respecto al horno." 
          : "Al disponer de Horno, el gratinado tradicional en bandeja grande es el rey: 200°C con grill durante 12 minutos.",
        ingredients_to_buy: [
          {
            product_id: 3,
            product_name: "Carne Picada Mixta (Ternera y Cerdo)",
            quantity: Math.max(0.5, minQty),
            unit: "kg",
            preparation: "Picada 2 veces (más fina para albóndigas)",
            reason: "Picada 2 veces para que el bocado del relleno quede fino y no se deshaga al cortar el canelón."
          }
        ],
        pantry_ingredients: [
          `${diners * 4} placas de canelones`,
          "1 cebolla dulce y 1 puerro picaditos",
          "50 ml de vino blanco seco o rancio",
          "500 ml de leche (para la bechamel)",
          "40 g de mantequilla o aceite de oliva",
          "Nuez moscada, sal y pimienta negra",
          "Queso rallado al gusto"
        ],
        steps: [
          {
            number: 1,
            title: "Pochado de la verdura",
            instruction: "En una sartén con un chorrito de aceite de oliva, pocha la cebolla y el puerro a fuego medio-bajo hasta que estén transparentes.",
            timer_minutes: 8
          },
          {
            number: 2,
            title: "Dorado de la carne",
            instruction: "Sube el fuego, añade la carne picada sazonada y dórala rompiendo los grumos con una cuchara de madera. Añade el vino blanco y deja evaporar el alcohol.",
            timer_minutes: 6
          },
          {
            number: 3,
            title: "Montaje y bechamel",
            instruction: "Hierve las placas de pasta según fabricante, rellena con la carne y enrolla. Cubre con la bechamel y queso.",
            timer_minutes: 10
          },
          {
            number: 4,
            title: "Gratinado final",
            instruction: chosenAppliance === 'airfryer' 
              ? "Gratina en tu Airfryer a 180°C durante 10 minutos hasta que la bechamel burbujee." 
              : "Introduce en el horno precalentado a 200°C con grill hasta dorar.",
            timer_minutes: 10
          }
        ]
      };
    }

    // 2. Menú Semanal Saludable (4 días)
    if (mode === 'menu_semanal' || q.includes('menu') || q.includes('semanal') || q.includes('semana')) {
      const best = hasAirfryer ? 'airfryer' : (hasSarten ? 'sarten' : 'horno');
      return {
        recipe_title: "Plan Semanal Equilibrado (4 Días Ligeros)",
        subtitle: `Menú variado, digestivo y rico en proteínas para ${diners} personas`,
        diners: diners,
        recommended_appliance: best,
        recommended_appliance_label: best === 'airfryer' ? '🍟 Airfryer + Plancha' : '🍳 Sartén / Plancha',
        prep_time_minutes: 30,
        healthy_tip: "Alternamos carnes blancas ligeras entre semana con ternera magra rica en hierro y zinc para mantener la energía sin digestiones pesadas.",
        appliance_tip: hasAirfryer 
          ? "Dispones de Airfryer: es la aliada perfecta para el pollo y las hamburguesas sin añadir nada de grasa extra, combinando con plancha rápida para la ternera." 
          : "Con tu sartén/plancha cocinarás vuelta y vuelta a fuego vivo, conservando todos los jugos naturales de la carne.",
        ingredients_to_buy: [
          {
            product_id: 4,
            product_name: "Pechuga de Pollo de Corral",
            quantity: Math.max(0.5, Math.round(diners * 0.2 * 100) / 100),
            unit: "kg",
            preparation: hasAirfryer ? "Tacos para arroz o fajitas" : "Fileteada normal",
            reason: hasAirfryer ? "En tacos para airfryer: queda dorada por fuera y súper tierna por dentro." : "Fileteada normal para vuelta y vuelta en plancha."
          },
          {
            product_id: 1,
            product_name: "Filetes de Ternera (Babilla 1ª)",
            quantity: Math.max(0.5, Math.round(diners * 0.2 * 100) / 100),
            unit: "kg",
            preparation: "Filetes muy finos (vuelta y vuelta)",
            reason: "Día 2: Ternera vuelta y vuelta con ensalada fresca de canónigos y nueces."
          },
          {
            product_id: 11,
            product_name: "Hamburguesas Caseras de Ternera (Pack 2 uds)",
            quantity: Math.max(2, Math.ceil(diners / 2)),
            unit: "ud",
            preparation: "Tradicionales con sal y pimienta",
            reason: "Día 3: Cena rápida y sana al plato con verduras asadas."
          }
        ],
        pantry_ingredients: [
          "Verduras frescas para guarnición (calabacín, champiñones, tomates)",
          "Limones frescos y hierbas aromáticas (orégano, tomillo)",
          "Aceite de oliva virgen extra y sal en escamas"
        ],
        steps: [
          {
            number: 1,
            title: "Lunes - Pollo aromático",
            instruction: hasAirfryer 
              ? "Marina los tacos de pollo 10 min con limón y orégano. Cocínalos en Airfryer a 190°C durante 10 minutos." 
              : "Cocina a la plancha muy caliente 2 minutos por lado con limón y tomillo.",
            timer_minutes: 8
          },
          {
            number: 2,
            title: "Martes - Ternera jugosa",
            instruction: "Sartén bien caliente con gota de aceite. 45 segundos por lado a fuego muy vivo para no desjugar.",
            timer_minutes: 3
          },
          {
            number: 3,
            title: "Miércoles - Hamburguesas con verduras",
            instruction: "Cocina las hamburguesas a fuego medio 3 min por lado para conservar su punto.",
            timer_minutes: 6
          }
        ]
      };
    }

    // 3. Si tiene Airfryer y busca algo rápido o crujiente
    if (hasAirfryer && (q.includes('pollo') || q.includes('rapido') || q.includes('cena') || q.includes('airfryer') || !q)) {
      return {
        recipe_title: "Pollo Crujiente Especiado en Airfryer (Zero Aceite)",
        subtitle: `Tierno por dentro y crujiente por fuera para ${diners} personas`,
        diners: diners,
        recommended_appliance: "airfryer",
        recommended_appliance_label: "🍟 Airfryer (La mejor opción)",
        prep_time_minutes: 20,
        healthy_tip: "Al usar la freidora de aire reducimos el 80% del aceite sin perder la textura crujiente de un asado.",
        appliance_tip: "De todos tus electrodomésticos, la Airfryer es la mejor hoy: tardarás solo 12 minutos y no ensuciarás sartenes con salpicaduras.",
        ingredients_to_buy: [
          {
            product_id: 4,
            product_name: "Pechuga de Pollo de Corral",
            quantity: Math.max(0.5, Math.round(diners * 0.25 * 100) / 100),
            unit: "kg",
            preparation: "Tacos para arroz o fajitas",
            reason: "El corte en tacos gruesos se mantiene súper jugoso en la freidora de aire sin quedarse seco como la pechuga fina."
          }
        ],
        pantry_ingredients: [
          "1 cucharadita de pimentón dulce de la Vera",
          "1/2 cucharadita de ajo en polvo y orégano",
          "1 cucharada de aceite de oliva virgen extra",
          "Sal marina fina"
        ],
        steps: [
          {
            number: 1,
            title: "Marinado exprés",
            instruction: "En un bol, mezcla los tacos de pollo con la cucharada de aceite, el pimentón, el ajo y las especias hasta que queden bien impregnados.",
            timer_minutes: 3
          },
          {
            number: 2,
            title: "Cocinado en Airfryer",
            instruction: "Coloca el pollo en el cestillo sin amontonar. Programa a 190°C durante 12 minutos, agitando a mitad de tiempo.",
            timer_minutes: 12
          },
          {
            number: 3,
            title: "Toque crujiente",
            instruction: "Si te gusta más dorado, sube a 205°C durante los últimos 2 minutos.",
            timer_minutes: 2
          }
        ]
      };
    }

    // 4. Guiso tradicional / Olla
    if ((hasOlla || hasHorno) && (q.includes('guiso') || q.includes('estofad') || q.includes('ternasco') || q.includes('patatas') || q.includes('cuchara'))) {
      const best = hasOlla ? 'olla_guiso' : 'horno';
      return {
        recipe_title: "Caldereta Tradicional Aragonesa al Chup-chup",
        subtitle: `Guiso meloso con salsa de verduras para ${diners} personas`,
        diners: diners,
        recommended_appliance: best,
        recommended_appliance_label: best === 'olla_guiso' ? '🍲 Olla tradicional / Rápida' : '🥘 Horno',
        prep_time_minutes: 50,
        healthy_tip: "La cocción lenta descompone el colágeno de forma natural creando una salsa espesa y sedosa sin necesidad de añadir harinas.",
        appliance_tip: hasOlla 
          ? "Te aconsejo tu olla: el chup-chup concentra los aromas del ternasco con el laurel y las verduras como ninguna otra técnica." 
          : "En horno a 160°C tapado con papel de aluminio conseguirás el mismo efecto de guiso meloso.",
        ingredients_to_buy: [
          {
            product_id: 7,
            product_name: "Paletilla de Ternasco Marcada",
            quantity: 1,
            unit: "kg",
            preparation: "Troceada para caldereta",
            reason: "Corte tradicional troceado en pedazos regulares para que la salsa ligue con el hueso y el tuétano."
          }
        ],
        pantry_ingredients: [
          "1 pimiento verde y 1 rojo",
          "1 cebolla grande y 3 dientes de ajo",
          "1 vaso de vino blanco o tinto de Cariñena",
          "2 patatas grandes de guarnición",
          "1 hoja de laurel y caldo de verduras"
        ],
        steps: [
          {
            number: 1,
            title: "Dorar la carne",
            instruction: "Sella los trozos de carne a fuego vivo con un buen chorro de aceite hasta que tomen color dorado. Reserva.",
            timer_minutes: 6
          },
          {
            number: 2,
            title: "Sofrito campesino",
            instruction: "En la misma olla pocha la cebolla, ajos y pimientos picados hasta que estén bien tiernos.",
            timer_minutes: 10
          },
          {
            number: 3,
            title: "Chup-chup",
            instruction: "Reincorpora la carne, añade el vino, deja evaporar 3 min, cubre con caldo y la hoja de laurel. Cocina a fuego lento.",
            timer_minutes: 35
          }
        ]
      };
    }

    // 5. Chef Gourmet / Sartén
    return {
      recipe_title: "Entrecot a la Sartén de Hierro con Mantequilla de Romero",
      subtitle: `Técnica de asador para disfrutar de un corte supremo (${diners} comensales)`,
      diners: diners,
      recommended_appliance: "sarten",
      recommended_appliance_label: "🍳 Sartén / Plancha (Imbatible)",
      prep_time_minutes: 15,
      healthy_tip: "Atemperar la carne 30 minutos antes de cocinar permite que el interior alcance la temperatura deseada sin quemar la grasa exterior.",
      appliance_tip: "Para este corte noble, la sartén de hierro o plancha bien caliente es insuperable: conseguirás la Reacción de Maillard perfecta en 4 minutos.",
      ingredients_to_buy: [
        {
          product_id: 2,
          product_name: "Entrecot de Vaca Madurada",
          quantity: Math.max(0.5, Math.round(diners * 0.3 * 100) / 100),
          unit: "kg",
          preparation: "Corte estándar (aprox. 350g)",
          reason: "Grosor exacto para lograr una costra dorada por fuera y un corazón rosado y jugoso."
        }
      ],
      pantry_ingredients: [
        "1 nuez de mantequilla o aceite de oliva virgen extra",
        "2 ramitas de romero fresco",
        "2 dientes de ajo chafados con piel",
        "Sal en escamas o sal gorda"
      ],
      steps: [
        {
          number: 1,
          title: "Atemperar y secar",
          instruction: "Saca la carne de la nevera 25 minutos antes. Sécala bien con papel de cocina para que dore en lugar de cocerse.",
          timer_minutes: 1
        },
        {
          number: 2,
          title: "Sellado a fuego vivo",
          instruction: "Sartén humeante. Cocina 2 minutos por lado sin mover la pieza. En el último minuto, añade la mantequilla, el romero y baña la carne con una cuchara.",
          timer_minutes: 4
        },
        {
          number: 3,
          title: "Reposo sagrado",
          instruction: "Pasa la carne a una tabla templada y déjala reposar 3 minutos antes de filetear para que los jugos se redistribuyan.",
          timer_minutes: 3
        }
      ]
    };
  }
}

module.exports = GeminiChefService;
