export interface Product {
  id: string;
  title: string;
  price: number;
}

export interface Node {
  tag: string;
  text?: string;
  children?: Node[];
}

export function ProductCard(product: Product): Node {
  return {
    tag: "article",
    children: [
      { tag: "h2", text: product.title },
      { tag: "p", text: `$${product.price.toFixed(2)}` },
    ],
  };
}
