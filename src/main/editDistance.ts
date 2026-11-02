export function editDistance(first: string, second: string): number {
  let previousRow = Array.from({ length: second.length + 1 }, (_, column) => column)
  for (let row = 1; row <= first.length; row++) {
    const currentRow = [row]
    for (let column = 1; column <= second.length; column++) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1
      const deletion = (previousRow[column] ?? 0) + 1
      const insertion = (currentRow[column - 1] ?? 0) + 1
      const substitution = (previousRow[column - 1] ?? 0) + substitutionCost
      currentRow.push(Math.min(deletion, insertion, substitution))
    }
    previousRow = currentRow
  }
  return previousRow[second.length] ?? 0
}
