const env = import.meta.env

export const SITE = {
  name: 'TOBOR',
  whatsapp: env.VITE_WHATSAPP_NUMBER || '918072051063',
  phone: env.VITE_CONTACT_PHONE || '+91 80720 51063',
  email: env.VITE_CONTACT_EMAIL || 'roboattis@gmail.com',
  address: [`'C' Block, Third Floor, Door No 84`, 'DK Adikesavalu Naidu Complex, Greams Road', 'Thousand Lights, Chennai, Tamil Nadu 600006'],
  mapUrl: 'https://maps.app.goo.gl/kcCiz2jyJf9MUXQz8',
  mapQuery: 'DK Adikesavalu Naidu Complex, Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006',
  hours: 'Monday to Friday, 10 am to 7 pm',
}

export const waLink = (text = 'Hi TOBOR, I have a question about 3D printing.') =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`
