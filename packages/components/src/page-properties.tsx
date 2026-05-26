import { getPageProperties } from "@silicajs/core/runtime";

export type PagePropertiesProps = {
  frontmatter: Record<string, unknown>;
  className?: string;
};

export function PageProperties({ frontmatter, className }: PagePropertiesProps) {
  const properties = getPageProperties(frontmatter);
  if (properties.length === 0) return null;

  return (
    <dl
      data-slot="page-properties"
      className={
        className ??
        "grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm text-muted-foreground"
      }
    >
      {properties.map((property) => (
        <div key={property.key} className="contents">
          <dt className="text-xs font-medium uppercase tracking-wider">
            {property.label}
          </dt>
          <dd className="text-foreground">{property.value}</dd>
        </div>
      ))}
    </dl>
  );
}
