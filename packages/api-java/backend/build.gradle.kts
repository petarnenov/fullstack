import org.flywaydb.core.Flyway
import org.flywaydb.core.api.MigrationInfo
import org.gradle.api.tasks.bundling.War

buildscript {
    repositories { mavenCentral() }
    dependencies {
        classpath("org.flywaydb:flyway-core:11.9.1")
        classpath("com.h2database:h2:2.2.224")
    }
}

plugins {
    id("java")
    id("war")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    // Struts 6
    implementation("org.apache.struts:struts2-core:6.6.1")

    // Akka 2.6.20 (Scala 2.13)
    implementation("com.typesafe.akka:akka-cluster-tools_2.13:2.6.20")
    implementation("com.typesafe.akka:akka-actor_2.13:2.6.20")
    implementation("com.typesafe.akka:akka-actor-typed_2.13:2.6.20")
    implementation("com.typesafe.akka:akka-cluster_2.13:2.6.20")
    implementation("com.typesafe.akka:akka-discovery_2.13:2.6.20")
    implementation("com.typesafe.akka:akka-cluster-typed_2.13:2.6.20")

    // Hibernate 5.6
    implementation("org.hibernate:hibernate-core:5.6.11.Final")

    // H2
    implementation("com.h2database:h2:2.2.224")

    // Flyway
    implementation("org.flywaydb:flyway-core:11.9.1")

    // Argon2id for password hashing (pure-Java fallback included — no JNI at runtime).
    implementation("de.mkammerer:argon2-jvm:2.11")

    // Gson, Lombok, Logging, Config
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("com.typesafe:config:1.4.2")
    implementation("ch.qos.logback:logback-classic:1.5.13")
    implementation("org.apache.logging.log4j:log4j-api:2.20.0")
    implementation("org.slf4j:log4j-over-slf4j:2.0.7")

    compileOnly("org.projectlombok:lombok:1.18.42")
    annotationProcessor("org.projectlombok:lombok:1.18.42")

    // Tomcat (provided)
    providedCompile("org.apache.tomcat:tomcat-servlet-api:9.0.100")
    providedCompile("org.apache.tomcat:tomcat-catalina:9.0.100")
}

tasks.named<War>("war") {
    archiveFileName.set("amp-api-java.war")
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    webInf {
        from("WebContent/WEB-INF")
    }
}

// ---------------------------------------------------------------------------
// Flyway — migrations live at <apiJavaRoot>/db_migrations/MIGRATIONS so the
// running Tomcat (via -Dproject.root=<apiJavaRoot>) can find them without
// baking them into the WAR classpath.
// ---------------------------------------------------------------------------

val apiJavaRoot = rootProject.projectDir.parentFile
val flywayScriptsPaths = listOf(
    listOf("filesystem:${apiJavaRoot}/db_migrations/MIGRATIONS")
)

fun generateFlywayObject(scriptsPath: List<String>): Flyway {
    return Flyway.configure()
        .dataSource("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1", "sa", "")
        .locations(*scriptsPath.toTypedArray())
        .outOfOrder(true)
        .validateOnMigrate(false)
        .load()
}

tasks.register("flywayLog") {
    doLast {
        for (path in flywayScriptsPaths) {
            val flyway = generateFlywayObject(path)
            println("Validating $path")
            val pendingMigrations: Array<MigrationInfo> = flyway.info().pending()
            println("\nPending migrations:")
            pendingMigrations.forEach {
                println("=================> Version: ${it.version}, Description: ${it.description}, Script: ${it.script}")
            }
            println("\nFlyway Log\n")
        }
    }
}

tasks.register("flywayCheck") {
    doLast {
        for (path in flywayScriptsPaths) {
            val flyway = generateFlywayObject(path)
            println("Checking $path")
            try {
                flyway.validate()
            } catch (e: Exception) {
                println("Flyway migration failed: ${e.message}")
                throw e
            }
        }
    }
}

tasks.register("flywayRun") {
    dependsOn("flywayLog")
    doLast {
        for (path in flywayScriptsPaths) {
            println("Running $path")
            val flyway = generateFlywayObject(path)
            try {
                flyway.migrate()
                println("Flyway migration completed successfully.")
            } catch (e: Exception) {
                println("Flyway migration failed: ${e.message}")
                throw e
            }
        }
    }
}

tasks.register("flywayBase") {
    doLast {
        for (path in flywayScriptsPaths) {
            val flyway = generateFlywayObject(path)
            try {
                flyway.baseline()
                println("Flyway base completed successfully.")
            } catch (e: Exception) {
                println("Flyway base failed: ${e.message}")
                throw e
            }
        }
    }
}
