using System.Reflection;
using Learner.Application;
using Learner.Domain.Common;
using NetArchTest.Rules;

namespace Learner.ArchitectureTests;

/// <summary>
/// Enforces the modular monolith: Clean Architecture layering, plus strict feature modules that talk to
/// each other only through Learner.Application.Contracts.*. Breaking a rule fails the build's tests.
/// </summary>
public class ModuleBoundaryTests
{
    private static readonly Assembly DomainAssembly = typeof(Entity).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(DependencyInjection).Assembly;

    private static readonly string[] ModuleNames = ["Identity", "Profiles", "Learning", "Plans"];

    public static TheoryData<string> Modules => new(ModuleNames);

    [Fact]
    public void Domain_depends_on_no_other_layer_or_framework()
    {
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOnAny("Learner.Application", "Learner.Infrastructure", "Learner.Api", "Microsoft.EntityFrameworkCore", "Microsoft.AspNetCore")
            .GetResult();

        AssertPassed(result);
    }

    [Fact]
    public void Application_does_not_depend_on_infrastructure_or_web()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .ShouldNot()
            .HaveDependencyOnAny("Learner.Infrastructure", "Learner.Api", "Microsoft.AspNetCore")
            .GetResult();

        AssertPassed(result);
    }

    [Theory]
    [MemberData(nameof(Modules))]
    public void Application_module_uses_other_modules_only_through_contracts(string module)
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That().ResideInNamespace($"Learner.Application.{module}")
            .ShouldNot().HaveDependencyOnAny(InternalsOfModulesOtherThan(module))
            .GetResult();

        AssertPassed(result);
    }

    [Theory]
    [MemberData(nameof(Modules))]
    public void Domain_module_does_not_reference_other_domain_modules(string module)
    {
        var otherDomains = ModuleNames.Where(m => m != module).Select(m => $"Learner.Domain.{m}").ToArray();

        var result = Types.InAssembly(DomainAssembly)
            .That().ResideInNamespace($"Learner.Domain.{module}")
            .ShouldNot().HaveDependencyOnAny(otherDomains)
            .GetResult();

        AssertPassed(result);
    }

    [Fact]
    public void Contracts_expose_no_module_internals()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That().ResideInNamespace("Learner.Application.Contracts")
            .ShouldNot().HaveDependencyOnAny(InternalsOfModulesOtherThan(module: null))
            .GetResult();

        AssertPassed(result);
    }

    [Fact]
    public void Dashboard_composes_modules_through_contracts_only()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That().ResideInNamespace("Learner.Application.Dashboard")
            .ShouldNot().HaveDependencyOnAny(InternalsOfModulesOtherThan(module: null))
            .GetResult();

        AssertPassed(result);
    }

    private static string[] InternalsOfModulesOtherThan(string? module) =>
        ModuleNames
            .Where(m => m != module)
            .SelectMany(m => new[] { $"Learner.Application.{m}", $"Learner.Domain.{m}" })
            .ToArray();

    private static void AssertPassed(TestResult result) =>
        Assert.True(result.IsSuccessful, "Boundary violations: " + string.Join(", ", result.FailingTypeNames ?? []));
}
