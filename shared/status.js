// The journey every job goes through. Photo requests start at "received" and go through
// modelling and quoting; shop and file orders join the same track at "paid".

export const STAGES = [
  { id: 'received', label: 'Request received', detail: 'We have your photos and contact details.' },
  { id: 'modelling', label: 'Modelling', detail: 'Our designers are building your 3D model.' },
  { id: 'quoted', label: 'Sample and quote sent', detail: 'Check the sample model and approve the quote.' },
  { id: 'paid', label: 'Payment confirmed', detail: 'Your order is in the print queue.' },
  { id: 'printing', label: 'Printing', detail: 'Your parts are on the printer now.' },
  { id: 'printed', label: 'Print complete', detail: 'Printed, cleaned and quality checked.' },
  { id: 'shipped', label: 'Out for delivery', detail: 'Handed to our courier partner.' },
  { id: 'delivered', label: 'Delivered', detail: 'Enjoy your prints.' },
]

export const ORDER_STAGES = STAGES.filter((s) => !['received', 'modelling', 'quoted'].includes(s.id))
export const PLACED_STAGE = { id: 'placed', label: 'Order placed', detail: 'Waiting for payment.' }

export const stageIndex = (stages, id) => stages.findIndex((s) => s.id === id)

export function whatsappText(kind, record) {
  const name = record.customer?.name?.split(' ')[0] || 'there'
  const id = record.id
  const lines = {
    received: `Hi ${name}, TOBOR here. We got your request ${id}. Our designers will send a sample model and quote soon.`,
    quoted: `Hi ${name}, your sample model and quote for ${id} are ready: ₹${record.quote?.amount}. Review and approve here: {link}`,
    paid: `Hi ${name}, payment received for ${id}. Your job is now in the print queue.`,
    printing: `Hi ${name}, ${id} is printing now.`,
    printed: `Hi ${name}, good news: ${id} has finished printing and passed our quality check.`,
    shipped: `Hi ${name}, ${id} is out for delivery with ${record.shipment?.courier || 'our courier partner'}${record.shipment?.awb ? ` (AWB ${record.shipment.awb})` : ''}. Track it here: {link}`,
    delivered: `Hi ${name}, ${id} has been delivered. Thanks for printing with TOBOR!`,
  }
  return lines[kind] ?? `Hi ${name}, there's an update on ${id}: {link}`
}
