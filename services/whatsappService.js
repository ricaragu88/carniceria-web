/**
 * ============================================================================
 * SERVICIO DE MENSAJERÍA WHATSAPP (Módulo Aislado)
 * ============================================================================
 * 
 * Este módulo centraliza la generación y envío de comunicaciones por WhatsApp.
 * 
 * FASE 1 (PILOTO ACTUAL - Sin Coste):
 * - Usa enlaces universales 'https://wa.me/NUMERO?text=MENSAJE'.
 * - El cliente abre su propio WhatsApp con el mensaje pre-rellenado y pulsa 'Enviar'.
 * - El carnicero al marcar 'Listo' abre el enlace wa.me para notificar al vecino.
 * 
 * ¿CÓMO CAMBIAR A LA API OFICIAL DE WHATSAPP (META) EN FASE 2?:
 * -------------------------------------------------------------
 * Para que los mensajes se envíen de forma 100% automática y silenciosa desde el servidor:
 * 1. Obtener acceso a la API Cloud de WhatsApp Business en Meta for Developers.
 * 2. Conseguir el `PHONE_NUMBER_ID` y el `WHATSAPP_TOKEN` de Meta.
 * 3. En este archivo, en lugar de retornar la URL wa.me, sustituir el método por una llamada
 *    HTTP POST a: `https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages`
 *    con el payload JSON oficial de Meta.
 * 4. ¡El resto de la aplicación (catálogo, base de datos, panel) NO necesitará ningún cambio!
 */

class WhatsAppService {
  /**
   * Limpia y normaliza el número de teléfono para wa.me (solo dígitos, con prefijo)
   * @param {string} phone 
   * @returns {string}
   */
  static cleanPhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    // Si es un número español de 9 dígitos sin prefijo, añadir 34
    if (cleaned.length === 9) {
      cleaned = '34' + cleaned;
    }
    return cleaned;
  }

  /**
   * Genera el texto del mensaje para un NUEVO PEDIDO (enviado por el vecino al carnicero)
   * 
   * Formato exacto requerido:
   * 🟢 NUEVO PEDIDO {CODIGO}
   * {nombre} — {vivienda} — Tel. {telefono}
   * Recogida: {franja}
   * • {cantidad} × {producto} ({preparación})
   * Total orientativo: {importe_orientativo} € (definitivo al pesar)
   * Notas: {notas}
   */
  static generateNewOrderText(order) {
    const lines = [];
    lines.push(`🟢 NUEVO PEDIDO ${order.code}`);
    lines.push(`${order.customer_name} — ${order.customer_address} — Tel. ${order.customer_phone}`);
    lines.push(`Recogida: ${order.pickup_slot}`);

    // Lista de productos solicitados
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        const prep = item.preparation ? ` (${item.preparation})` : '';
        const unitLabel = item.unit === 'kg' ? 'kg' : 'ud.';
        lines.push(`• ${item.quantity} ${unitLabel} × ${item.product_name}${prep}`);
      });
    }

    const estimatedTotal = Number(order.estimated_total || 0).toFixed(2);
    lines.push(`Total orientativo: ${estimatedTotal} € (definitivo al pesar)`);
    
    if (order.notes && order.notes.trim()) {
      lines.push(`Notas: ${order.notes.trim()}`);
    } else {
      lines.push(`Notas: Ninguna`);
    }

    return lines.join('\n');
  }

  /**
   * Genera el enlace wa.me para que el vecino envíe su pedido al carnicero
   */
  static getNewOrderLink(storePhone, order) {
    const text = this.generateNewOrderText(order);
    const targetPhone = this.cleanPhone(storePhone);
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Genera el texto de AVISO DE PEDIDO LISTO (enviado por el carnicero al vecino)
   * 
   * Formato exacto requerido:
   * 🥩 Tu pedido {CODIGO} ya está listo. Importe final: {importe_final} €. Puedes pasar a recogerlo por [NOMBRE_CARNICERÍA]. ¡Gracias!
   */
  static generateOrderReadyText(order, storeName) {
    const finalAmount = Number(order.final_amount || order.estimated_total || 0).toFixed(2);
    return `🥩 Tu pedido ${order.code} ya está listo. Importe final: ${finalAmount} €. Puedes pasar a recogerlo por ${storeName}. ¡Gracias!`;
  }

  /**
   * Genera el enlace wa.me para que el carnicero avise al vecino de que su pedido está listo
   */
  static getOrderReadyLink(customerPhone, order, storeName) {
    const text = this.generateOrderReadyText(order, storeName);
    const targetPhone = this.cleanPhone(customerPhone);
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
  }
}

module.exports = WhatsAppService;
