export const balancedBracketsStarters: Record<string, string> = {
  javascript: `function isBalanced(text) {
  const stack = [];
  const matches = { ')': '(', ']': '[', '}': '{' };
  for (const char of text) {
    if ('([{'.includes(char)) stack.push(char);
    else if (!matches[char] || stack.pop() !== matches[char]) return false;
  }
  return stack.length === 0;
}`,
  typescript: `function isBalanced(text: string): boolean {
  const stack: string[] = [];
  const matches: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const char of text) {
    if (char === '(' || char === '[' || char === '{') stack.push(char);
    else if (!matches[char] || stack.pop() !== matches[char]) return false;
  }
  return stack.length === 0;
}`,
  python: `import json
import sys

text = json.loads(sys.stdin.read())["text"]
stack = []
matches = {")": "(", "]": "[", "}": "{"}

for char in text:
    if char in "([{":
        stack.append(char)
    elif char not in matches or not stack or stack.pop() != matches[char]:
        print("false")
        sys.exit(0)

print("true" if not stack else "false")`,
  java: String.raw`import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        String input = new BufferedReader(new InputStreamReader(System.in)).readLine();
        int key = input == null ? -1 : input.indexOf("\"text\"");
        int colon = key < 0 ? -1 : input.indexOf(':', key);
        int start = colon < 0 ? -1 : input.indexOf('"', colon) + 1;
        int end = start < 1 ? -1 : input.indexOf('"', start);
        boolean valid = end >= 0;
        char[] stack = new char[valid ? end - start : 0];
        int top = 0;
        for (int i = start; valid && i < end; i++) {
            char c = input.charAt(i);
            if (c == '(' || c == '[' || c == '{') stack[top++] = c;
            else {
                char expected = c == ')' ? '(' : c == ']' ? '[' : c == '}' ? '{' : '\0';
                if (expected == '\0' || top == 0 || stack[--top] != expected) valid = false;
            }
        }
        System.out.println(valid && top == 0 ? "true" : "false");
    }
}`,
  c: String.raw`#include <stdio.h>
#include <string.h>

int main(void) {
    char input[65536];
    if (!fgets(input, sizeof(input), stdin)) {
        puts("false");
        return 0;
    }
    char *key = strstr(input, "\"text\"");
    char *colon = key ? strchr(key, ':') : NULL;
    char *start = colon ? strchr(colon + 1, '"') : NULL;
    if (!start) {
        puts("false");
        return 0;
    }
    start++;

    char stack[65536];
    size_t top = 0;
    for (char *p = start; *p && *p != '"'; p++) {
        char c = *p;
        if (c == '(' || c == '[' || c == '{') stack[top++] = c;
        else {
            char expected = c == ')' ? '(' : c == ']' ? '[' : c == '}' ? '{' : '\0';
            if (!expected || top == 0 || stack[--top] != expected) {
                puts("false");
                return 0;
            }
        }
    }
    puts(top == 0 ? "true" : "false");
    return 0;
}`,
  cpp: String.raw`#include <iostream>
#include <iterator>
#include <string>
#include <vector>

int main() {
    std::string input((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());
    auto key = input.find("\"text\"");
    auto colon = key == std::string::npos ? key : input.find(':', key);
    auto quote = colon == std::string::npos ? colon : input.find('"', colon + 1);
    auto end = quote == std::string::npos ? quote : input.find('"', quote + 1);
    if (end == std::string::npos) {
        std::cout << "false\n";
        return 0;
    }

    std::vector<char> stack;
    for (char c : input.substr(quote + 1, end - quote - 1)) {
        if (c == '(' || c == '[' || c == '{') stack.push_back(c);
        else {
            char expected = c == ')' ? '(' : c == ']' ? '[' : c == '}' ? '{' : '\0';
            if (!expected || stack.empty() || stack.back() != expected) {
                std::cout << "false\n";
                return 0;
            }
            stack.pop_back();
        }
    }
    std::cout << (stack.empty() ? "true" : "false") << '\n';
}`,
  csharp: String.raw`using System;
using System.Collections.Generic;
using System.IO;

class Program {
    static void Main() {
        string input = Console.In.ReadToEnd();
        int key = input.IndexOf("\"text\"", StringComparison.Ordinal);
        int colon = key < 0 ? -1 : input.IndexOf(':', key);
        int quote = colon < 0 ? -1 : input.IndexOf('"', colon + 1);
        int end = quote < 0 ? -1 : input.IndexOf('"', quote + 1);
        if (end < 0) {
            Console.WriteLine("false");
            return;
        }

        var stack = new Stack<char>();
        for (int i = quote + 1; i < end; i++) {
            char c = input[i];
            if (c == '(' || c == '[' || c == '{') stack.Push(c);
            else {
                char expected = c == ')' ? '(' : c == ']' ? '[' : c == '}' ? '{' : '\0';
                if (expected == '\0' || stack.Count == 0 || stack.Pop() != expected) {
                    Console.WriteLine("false");
                    return;
                }
            }
        }
        Console.WriteLine(stack.Count == 0 ? "true" : "false");
    }
}`,
  go: String.raw`package main

import (
    "encoding/json"
    "fmt"
    "os"
)

func main() {
    var input struct {
        Text string "json:\"text\""
    }
    if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
        fmt.Println("false")
        return
    }

    stack := []rune{}
    matches := map[rune]rune{')': '(', ']': '[', '}': '{'}
    for _, char := range input.Text {
        if char == '(' || char == '[' || char == '{' {
            stack = append(stack, char)
        } else {
            expected, ok := matches[char]
            if !ok || len(stack) == 0 || stack[len(stack)-1] != expected {
                fmt.Println("false")
                return
            }
            stack = stack[:len(stack)-1]
        }
    }
    fmt.Println(len(stack) == 0)
}`,
  rust: String.raw`use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    if io::stdin().read_to_string(&mut input).is_err() {
        println!("false");
        return;
    }
    let Some(key) = input.find("\"text\"") else {
        println!("false");
        return;
    };
    let Some(colon_offset) = input[key..].find(':') else {
        println!("false");
        return;
    };
    let Some(quote_offset) = input[key + colon_offset + 1..].find('"') else {
        println!("false");
        return;
    };
    let start = key + colon_offset + 1 + quote_offset + 1;
    let Some(end_offset) = input[start..].find('"') else {
        println!("false");
        return;
    };

    let mut stack = Vec::new();
    for c in input[start..start + end_offset].chars() {
        if "([{".contains(c) {
            stack.push(c);
        } else {
            let expected = match c { ')' => '(', ']' => '[', '}' => '{', _ => '\0' };
            if expected == '\0' || stack.pop() != Some(expected) {
                println!("false");
                return;
            }
        }
    }
    println!("{}", stack.is_empty());
}`,
  php: `<?php
$input = json_decode(stream_get_contents(STDIN), true);
$text = $input["text"] ?? "";
$stack = [];
$matches = [")" => "(", "]" => "[", "}" => "{"];

foreach (str_split($text) as $char) {
    if (in_array($char, ["(", "[", "{"], true)) {
        $stack[] = $char;
    } elseif (!isset($matches[$char]) || !$stack || array_pop($stack) !== $matches[$char]) {
        echo "false", PHP_EOL;
        exit(0);
    }
}

echo json_encode(count($stack) === 0), PHP_EOL;`,
  ruby: `require "json"

text = JSON.parse(STDIN.read).fetch("text", "")
stack = []
matches = { ")" => "(", "]" => "[", "}" => "{" }
valid = true

text.each_char do |char|
  if ["(", "[", "{"].include?(char)
    stack.push(char)
  elsif !matches.key?(char) || stack.empty? || stack.pop != matches[char]
    valid = false
    break
  end
end

puts(valid && stack.empty? ? "true" : "false")`,
  kotlin: String.raw`import java.util.ArrayDeque

fun main() {
    val input = generateSequence(::readLine).joinToString("\n")
    val key = input.indexOf("\"text\"")
    val colon = if (key < 0) -1 else input.indexOf(':', key)
    val quote = if (colon < 0) -1 else input.indexOf('"', colon + 1)
    val end = if (quote < 0) -1 else input.indexOf('"', quote + 1)
    if (end < 0) {
        println("false")
        return
    }

    val stack = ArrayDeque<Char>()
    for (char in input.substring(quote + 1, end)) {
        if (char == '(' || char == '[' || char == '{') stack.addLast(char)
        else {
            val expected = when (char) { ')' -> '('; ']' -> '['; '}' -> '{'; else -> '\u0000' }
            if (expected == '\u0000' || stack.isEmpty() || stack.removeLast() != expected) {
                println("false")
                return
            }
        }
    }
    println(if (stack.isEmpty()) "true" else "false")
}`
};
