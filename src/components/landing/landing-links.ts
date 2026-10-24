/** Search links from the public landing page. Signed-out visitors return here after login. */
export const serviceSearchPath = (service?: string) =>
  service ? `/services/search?${new URLSearchParams({ service })}` : '/services/search'
