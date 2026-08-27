export type NavLink = {
  label: string;
  href: string;
};

export type NavItem = NavLink | {
  label: string;
  children: NavLink[];
};

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "PGPG Officials",
    children: [
      {
        label: "Capiz Provincial Council",
        href: "/officials/capiz-provincial-council",
      },
      {
        label: "PGPGS Roxas City Capiz Chapter Officers",
        href: "/officials/roxas-city-chapter-officers",
      },
      {
        label: "Former Chapter President",
        href: "/officials/former-chapter-president",
      },
      {
        label: "Former Master Initiator",
        href: "/officials/former-master-initiator",
      },
      {
        label: "Former Grand Knights",
        href: "/officials/former-grand-knights",
      },
    ],
  },
  {
    label: "About Us",
    children: [
      {
        label: "Pi Gamma Phi Gamma Sigma History",
        href: "/about/history",
      },
      {
        label: "PGPGS Roxas City Founding",
        href: "/about/founding",
      },
      {
        label: "Our Founding Fathers",
        href: "/about/founding-fathers",
      },
    ],
  },
  {
    label: "Community Services",
    children: [
      {
        label: "Blood Letting Activities",
        href: "/community/blood-letting",
      },
      {
        label: "Clean Up Drives",
        href: "/community/clean-up-drives",
      },
      {
        label: "Tree Planting Activities",
        href: "/community/tree-planting",
      },
      {
        label: "Feeding Program",
        href: "/community/feeding-program",
      },
    ],
  },
  { label: "Our Alumni", href: "/alumni" },
];

export const cta = {
  label: "Be one of us!",
  href: "/join",
};

export function isNavGroup(
  item: NavItem,
): item is { label: string; children: NavLink[] } {
  return "children" in item;
}
