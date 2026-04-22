// Minimal region mapping + defaults. Extend as needed.

const REGION_BY_COUNTRY = new Map(
  [
    ['Japan', 'Asia'],
    ['Nepal', 'Asia'],
    ['India', 'Asia'],
    ['China', 'Asia'],
    ['Korea', 'Asia'],
    ['Thailand', 'Asia'],
    ['Indonesia', 'Asia'],
    ['Philippines', 'Asia'],
    ['Vietnam', 'Asia'],
    ['Sri Lanka', 'Asia'],
    ['Pakistan', 'Asia'],
    ['Bangladesh', 'Asia'],
    ['Iran', 'Asia'],
    ['Iraq', 'Asia'],
    ['Saudi Arabia', 'Middle East'],
    ['Turkey', 'Europe/Asia'],
    ['Greece', 'Europe'],
    ['Italy', 'Europe'],
    ['France', 'Europe'],
    ['Germany', 'Europe'],
    ['Spain', 'Europe'],
    ['United Kingdom', 'Europe'],
    ['Ireland', 'Europe'],
    ['Norway', 'Europe'],
    ['Sweden', 'Europe'],
    ['Finland', 'Europe'],
    ['Russia', 'Europe/Asia'],
    ['Egypt', 'Africa'],
    ['Nigeria', 'Africa'],
    ['Ethiopia', 'Africa'],
    ['South Africa', 'Africa'],
    ['Kenya', 'Africa'],
    ['Morocco', 'Africa'],
    ['Ghana', 'Africa'],
    ['United States', 'Americas'],
    ['Canada', 'Americas'],
    ['Mexico', 'Americas'],
    ['Brazil', 'Americas'],
    ['Argentina', 'Americas'],
    ['Chile', 'Americas'],
    ['Peru', 'Americas'],
    ['Colombia', 'Americas'],
    ['Australia', 'Oceania'],
    ['New Zealand', 'Oceania']
  ].map(([k, v]) => [k.toLowerCase(), v])
)

export function getRegionForCountry(country) {
  const key = String(country || '').trim().toLowerCase()
  return REGION_BY_COUNTRY.get(key) || 'Global'
}

