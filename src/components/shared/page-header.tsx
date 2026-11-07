type PageHeaderProps = {
  title: string;
  /** Optional - omit it and the header renders as a bare title */
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="font-display text-xl sm:text-3xl font-bold">{title}</h1>
      {description && (
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      )}
    </div>
  );
}
