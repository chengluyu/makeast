# Astgen

Astgen is a transpiler that helps you quickly generate abstract syntax tree classes and interfaces in JavaScript/TypeScript.

## Why Use Astgen

* Quickly generate usable classes and interfaces.
* Fast prototype your idea when building parsers.
* Painless visitor pattern and factory class.

## Example

Suppose you're going to build a arithmetic calculator. You can write the abstract syntax tree strucutre in a top-down manner.

```
@tag("kind", "SyntaxTreeKind")
tree SyntaxTreeNode {
  node Token {
    text: string
  }
  tree Expression {
    node BinaryExpression {
      operator: Token
      left: Expression
      right: Expression
    }
    node UnaryExpression {
      operator: Token
      operand: Expression
    }
    node NumericLiteral {
      raw: string
      parsed: number
    }
  }
}
```
Take a closer look of the description above.

* Keyword `node` indicates a syntax tree node in a leaf position. It will be translated into an interface.
* The keyword `tree` indicate a container for one or more nodes and trees. It will be transpiled into an union type of all sub nodes.
* The decorator `@tag("kind", "SyntaxTreeKind")` means generate an enum named `SyntaxTreeNode` together with the tree and every node inside the tree will be included as an enum constant.

Astgen will generate following TypeScript interfaces and enums for you.

```typescript
export enum SyntaxTreeKind {
  Token,
  BinaryExpression,
  UnaryExpression,
  NumericLiteral,
}

export interface Token {
  kind: SyntaxTreeKind.Token;
  text: string;
}

export interface BinaryExpression {
  kind: SyntaxTreeKind.BinaryExpression;
  operator: Token;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  kind: SyntaxTreeKind.UnaryExpression;
  operator: Token;
  operand: Expression;
}

export interface NumericLiteral {
  kind: SyntaxTreeKind.NumericLiteral;
  raw: string;
  parsed: number;
}

type Expression = BinaryExpression | UnaryExpression | NumericLiteral;

type SyntaxTreeNode = Token | Expression;
```
