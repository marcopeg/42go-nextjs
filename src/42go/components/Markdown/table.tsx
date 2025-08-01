import React from "react";

export function createTable(params?: { className?: string }) {
  const Table = React.forwardRef<
    HTMLTableElement,
    React.ComponentPropsWithoutRef<"table">
  >(({ children, ...props }, ref) => (
    <div className="my-6 w-full overflow-y-auto">
      <table
        className={params?.className || "w-full border-collapse text-sm"}
        {...props}
        ref={ref}
      >
        {children}
      </table>
    </div>
  ));
  Table.displayName = "MarkdownTable";
  return Table;
}

export function createTHead(params?: { className?: string }) {
  const Thead = React.forwardRef<
    HTMLTableSectionElement,
    React.ComponentPropsWithoutRef<"thead">
  >(({ children, ...props }, ref) => (
    <thead className={params?.className || "bg-muted/50"} {...props} ref={ref}>
      {children}
    </thead>
  ));
  Thead.displayName = "MarkdownTableHead";
  return Thead;
}

export function createTBody(params?: { className?: string }) {
  const Tbody = React.forwardRef<
    HTMLTableSectionElement,
    React.ComponentPropsWithoutRef<"tbody">
  >(({ children, ...props }, ref) => (
    <tbody
      className={params?.className || "divide-y divide-border"}
      {...props}
      ref={ref}
    >
      {children}
    </tbody>
  ));
  Tbody.displayName = "MarkdownTableBody";
  return Tbody;
}

export function createTr(params?: { className?: string }) {
  const Tr = React.forwardRef<
    HTMLTableRowElement,
    React.ComponentPropsWithoutRef<"tr">
  >(({ children, ...props }, ref) => (
    <tr
      className={params?.className || "m-0 border-t p-0 even:bg-muted/20"}
      {...props}
      ref={ref}
    >
      {children}
    </tr>
  ));
  Tr.displayName = "MarkdownTableRow";
  return Tr;
}

export function createTh(params?: { className?: string }) {
  const Th = React.forwardRef<
    HTMLTableCellElement,
    React.ComponentPropsWithoutRef<"th">
  >(({ children, ...props }, ref) => (
    <th
      className={
        params?.className ||
        "border border-border px-4 py-2 text-left font-bold"
      }
      {...props}
      ref={ref}
    >
      {children}
    </th>
  ));
  Th.displayName = "MarkdownTableHeader";
  return Th;
}

export function createTd(params?: { className?: string }) {
  const Td = React.forwardRef<
    HTMLTableCellElement,
    React.ComponentPropsWithoutRef<"td">
  >(({ children, ...props }, ref) => (
    <td
      className={
        params?.className || "border border-border px-4 py-2 text-left"
      }
      {...props}
      ref={ref}
    >
      {children}
    </td>
  ));
  Td.displayName = "MarkdownTableCell";
  return Td;
}
