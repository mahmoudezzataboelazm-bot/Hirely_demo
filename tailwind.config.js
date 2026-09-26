/** Tailwind is used ONLY by the Super Admin portal.
 *  - preflight is off so the reset never touches the other three portals
 *  - `important` scopes every utility under .superadmin-root
 *  - content is limited to the superadmin folder
 */
export default {
  content: ['./src/superadmin/**/*.{js,jsx}'],
  important: '.superadmin-root',
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
}
