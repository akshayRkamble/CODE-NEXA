export const practiceLanguages = [
  { id: 'javascript', label: 'JavaScript', fileName: 'main.js' },
  { id: 'typescript', label: 'TypeScript', fileName: 'main.ts' },
  { id: 'python', label: 'Python', fileName: 'main.py' },
  { id: 'java', label: 'Java', fileName: 'Main.java' },
  { id: 'c', label: 'C', fileName: 'main.c' },
  { id: 'cpp', label: 'C++', fileName: 'main.cpp' },
  { id: 'csharp', label: 'C#', fileName: 'main.cs' },
  { id: 'go', label: 'Go', fileName: 'main.go' },
  { id: 'rust', label: 'Rust', fileName: 'main.rs' },
  { id: 'php', label: 'PHP', fileName: 'main.php' },
  { id: 'ruby', label: 'Ruby', fileName: 'main.rb' },
  { id: 'kotlin', label: 'Kotlin', fileName: 'Main.kt' }
] as const;

export type PracticeLanguage = typeof practiceLanguages[number]['id'];

export const standaloneStarters: Partial<Record<PracticeLanguage, string>> = {
  python: `import json
import sys

input_data = json.loads(sys.stdin.read())

def solve(data):
    # Return the result as a JSON-compatible value.
    return None

print(json.dumps(solve(input_data), separators=(",", ":")))`,
  java: `import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) throws Exception {
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        // Parse the JSON input and print the result as JSON.
        System.out.println("null");
    }
}`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    /* Read JSON from stdin and print the result as JSON. */
    puts("null");
    return 0;
}`,
  cpp: `#include <iostream>
#include <iterator>
#include <string>

int main() {
    std::string input((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());
    // Parse the JSON input and print the result as JSON.
    std::cout << "null\\n";
}`,
  csharp: `using System;

var input = Console.In.ReadToEnd();
// Parse the JSON input and print the result as JSON.
Console.WriteLine("null");`,
  go: `package main

import (
    "encoding/json"
    "os"
)

func main() {
    var input interface{}
    _ = json.NewDecoder(os.Stdin).Decode(&input)
    // Compute the result and encode it as JSON.
    _ = json.NewEncoder(os.Stdout).Encode(nil)
}`,
  rust: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).expect("read input");
    // Parse the JSON input and print the result as JSON.
    println!("null");
}`,
  php: `<?php
$input = json_decode(stream_get_contents(STDIN), true);
function solve($data) {
    // Return the result as a JSON-compatible value.
    return null;
}
echo json_encode(solve($input), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;`,
  ruby: `require "json"
input_data = JSON.parse(STDIN.read)
def solve(data)
  # Return the result as a JSON-compatible value.
  nil
end
puts JSON.generate(solve(input_data))`,
  kotlin: `import java.io.BufferedReader

fun main() {
    val input = generateSequence(::readLine).joinToString("\\n")
    // Parse the JSON input and print the result as JSON.
    println("null")
}`
};

export function getPracticeLanguage(value: string) {
  return practiceLanguages.find(language => language.id === value) ?? practiceLanguages[0];
}
