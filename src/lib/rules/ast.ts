// Safe expression evaluator for rule conditions.
// Supports: number/string/bool literals, identifiers, member access,
//   comparison (==, !=, <, <=, >, >=), arithmetic (+ - * /),
//   boolean (&&, ||, AND, OR, !, NOT), parentheses, null literal.
// Forbids: function calls, assignments, bitwise ops, object/array literals.

type Token =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "dot" }
  | { kind: "bool"; value: boolean }
  | { kind: "null" };

const OPS = [
  ">=",
  "<=",
  "==",
  "!=",
  "&&",
  "||",
  ">",
  "<",
  "+",
  "-",
  "*",
  "/",
  "!",
];

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(") {
      out.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ".") {
      out.push({ kind: "dot" });
      i++;
      continue;
    }
    // String literal
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let val = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) {
          val += src[j + 1];
          j += 2;
        } else {
          val += src[j];
          j++;
        }
      }
      if (src[j] !== quote) throw new SyntaxError("Unterminated string");
      out.push({ kind: "str", value: val });
      i = j + 1;
      continue;
    }
    // Number literal (supports underscores like 5_000_000_000)
    if (/\d/.test(c)) {
      let j = i;
      let raw = "";
      while (j < src.length && /[0-9_.eE+\-]/.test(src[j])) {
        // Stop signed exponent if no e/E before
        if ((src[j] === "+" || src[j] === "-") &&
            !(j > i && /[eE]/.test(src[j - 1]))) break;
        raw += src[j];
        j++;
      }
      const num = Number(raw.replace(/_/g, ""));
      if (isNaN(num)) throw new SyntaxError(`Bad number: ${raw}`);
      out.push({ kind: "num", value: num });
      i = j;
      continue;
    }
    // Identifier or keyword
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === "true") out.push({ kind: "bool", value: true });
      else if (word === "false") out.push({ kind: "bool", value: false });
      else if (word === "null") out.push({ kind: "null" });
      else if (word === "AND") out.push({ kind: "op", value: "&&" });
      else if (word === "OR") out.push({ kind: "op", value: "||" });
      else if (word === "NOT") out.push({ kind: "op", value: "!" });
      else out.push({ kind: "ident", value: word });
      i = j;
      continue;
    }
    // Operator
    let matched = false;
    for (const op of OPS) {
      if (src.startsWith(op, i)) {
        out.push({ kind: "op", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    throw new SyntaxError(`Unexpected character '${c}' at ${i}`);
  }
  return out;
}

// Recursive-descent / Pratt-like parser.
type Node =
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | { type: "bool"; value: boolean }
  | { type: "null" }
  | { type: "ident"; name: string }
  | { type: "member"; object: Node; property: string }
  | { type: "binary"; op: string; left: Node; right: Node }
  | { type: "unary"; op: string; operand: Node };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): Node {
    const expr = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new SyntaxError(`Unexpected token at position ${this.pos}`);
    }
    return expr;
  }

  private peek() {
    return this.tokens[this.pos];
  }

  private eat() {
    return this.tokens[this.pos++];
  }

  private matchOp(op: string): boolean {
    const t = this.peek();
    if (t && t.kind === "op" && t.value === op) {
      this.pos++;
      return true;
    }
    return false;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.matchOp("||")) {
      const right = this.parseAnd();
      left = { type: "binary", op: "||", left, right };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseEquality();
    while (this.matchOp("&&")) {
      const right = this.parseEquality();
      left = { type: "binary", op: "&&", left, right };
    }
    return left;
  }

  private parseEquality(): Node {
    let left = this.parseComparison();
    while (true) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "==" || t.value === "!=")) {
        this.pos++;
        const right = this.parseComparison();
        left = { type: "binary", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseComparison(): Node {
    let left = this.parseAddition();
    while (true) {
      const t = this.peek();
      if (
        t && t.kind === "op" &&
        (t.value === "<" || t.value === "<=" || t.value === ">" || t.value === ">=")
      ) {
        this.pos++;
        const right = this.parseAddition();
        left = { type: "binary", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseAddition(): Node {
    let left = this.parseMultiplication();
    while (true) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.pos++;
        const right = this.parseMultiplication();
        left = { type: "binary", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseMultiplication(): Node {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "*" || t.value === "/")) {
        this.pos++;
        const right = this.parseUnary();
        left = { type: "binary", op: t.value, left, right };
      } else break;
    }
    return left;
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (t && t.kind === "op" && (t.value === "!" || t.value === "-")) {
      this.pos++;
      const operand = this.parseUnary();
      return { type: "unary", op: t.value, operand };
    }
    return this.parseMember();
  }

  private parseMember(): Node {
    let node = this.parsePrimary();
    while (this.peek()?.kind === "dot") {
      this.eat();
      const id = this.eat();
      if (!id || id.kind !== "ident") {
        throw new SyntaxError("Expected identifier after '.'");
      }
      node = { type: "member", object: node, property: id.value };
    }
    return node;
  }

  private parsePrimary(): Node {
    const t = this.eat();
    if (!t) throw new SyntaxError("Unexpected end of input");
    if (t.kind === "num") return { type: "num", value: t.value };
    if (t.kind === "str") return { type: "str", value: t.value };
    if (t.kind === "bool") return { type: "bool", value: t.value };
    if (t.kind === "null") return { type: "null" };
    if (t.kind === "ident") return { type: "ident", name: t.value };
    if (t.kind === "lparen") {
      const expr = this.parseOr();
      const close = this.eat();
      if (!close || close.kind !== "rparen") {
        throw new SyntaxError("Expected ')'");
      }
      return expr;
    }
    throw new SyntaxError(`Unexpected token: ${JSON.stringify(t)}`);
  }
}

function evalNode(node: Node, scope: Record<string, unknown>): unknown {
  switch (node.type) {
    case "num":
      return node.value;
    case "str":
      return node.value;
    case "bool":
      return node.value;
    case "null":
      return null;
    case "ident":
      return scope[node.name];
    case "member": {
      const obj = evalNode(node.object, scope);
      if (obj == null) return null;
      return (obj as Record<string, unknown>)[node.property];
    }
    case "unary": {
      const v = evalNode(node.operand, scope);
      if (node.op === "!") return !v;
      if (node.op === "-") return -(Number(v) || 0);
      throw new Error(`Unknown unary op: ${node.op}`);
    }
    case "binary": {
      const l = evalNode(node.left, scope);
      // Short-circuit for &&, ||
      if (node.op === "&&") return l ? evalNode(node.right, scope) : l;
      if (node.op === "||") return l ? l : evalNode(node.right, scope);
      const r = evalNode(node.right, scope);
      switch (node.op) {
        case "+":
          return (typeof l === "string" || typeof r === "string")
            ? String(l ?? "") + String(r ?? "")
            : Number(l) + Number(r);
        case "-": return Number(l) - Number(r);
        case "*": return Number(l) * Number(r);
        case "/": return Number(l) / Number(r);
        case "==": return l == r;
        case "!=": return l != r;
        case "<": return Number(l) < Number(r);
        case "<=": return Number(l) <= Number(r);
        case ">": return Number(l) > Number(r);
        case ">=": return Number(l) >= Number(r);
      }
      throw new Error(`Unknown binary op: ${node.op}`);
    }
  }
}

export function evalSafe(expr: string, scope: Record<string, unknown>): unknown {
  const tokens = tokenize(expr);
  const ast = new Parser(tokens).parse();
  return evalNode(ast, scope);
}

// Friendly wrapper for boolean evaluation
export function evalCondition(expr: string, scope: Record<string, unknown>): boolean {
  return Boolean(evalSafe(expr, scope));
}
